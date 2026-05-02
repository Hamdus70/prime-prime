import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, getDocs, serverTimestamp, orderBy, limit, collectionGroup } from "firebase/firestore";
import { Plus, Microscope, Pill, Activity, ShoppingCart } from "lucide-react";
import { useAuth } from "@/routes/portal";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";

/**
 * Global Clinical Request Engine Helper
 */
export async function createClinicalRequest(
  patientId: string, 
  deptFrom: string, 
  deptTo: string, 
  requestType: "Pharmacy" | "Laboratory" | "Radiology", 
  details: any, 
  priority: "Routine" | "Urgent" | "STAT",
  userId: string
) {
  try {
    let collectionPath = "";
    let data: any = {
      patientId,
      requestedBy: userId,
      requestedFrom: deptFrom,
      requestedAt: serverTimestamp(),
      status: "pending",
      priority,
      ...details
    };

    if (requestType === "Pharmacy") {
      collectionPath = "pharmacy_orders";
      data.drugName = details.drugName;
      data.type = "hospital_fulfillment";
    } else {
      collectionPath = `patients/${patientId}/investigations`;
      data.category = requestType;
      data.status = "requested"; // Investigations use 'requested' as initial status
    }

    const docRef = await addDoc(collection(db, collectionPath), data);

    // Notification System
    await addDoc(collection(db, "alerts"), {
      patientId,
      requestId: docRef.id,
      type: `${requestType.toLowerCase()}_request`,
      message: `${deptFrom} requested ${deptTo}: ${details.drugName || details.type} (${priority})`,
      priority: priority === "STAT" ? "high" : "normal",
      status: "active",
      createdAt: serverTimestamp(),
      targetDept: deptTo.toLowerCase()
    });

    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, requestType);
    throw err;
  }
}

export function PrescriptionManager({ patientId, requestedFrom = "General Medicine" }: { patientId: string; requestedFrom?: string }) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prescribing, setPrescribing] = useState(false);
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [patientId]);

  async function fetchData() {
    setLoading(true);
    try {
      const iSnap = await getDocs(collection(db, "inventory"));
      setInventory(iSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const oSnap = await getDocs(query(collection(db, "pharmacy_orders"), where("patientId", "==", patientId), orderBy("createdAt", "desc")));
      setOrders(oSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePrescribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPrescribing(true);
    const formData = new FormData(e.currentTarget);
    const drugName = formData.get("drugName") as string;
    const dosage = formData.get("dosage") as string;
    const quantity = Number(formData.get("quantity"));

    const item = inventory.find(i => i.name === drugName);

    const orderData = {
      patientId,
      drugName,
      dosage,
      quantity,
      unitPrice: item?.unitPrice || 0,
      status: "pending",
      prescribedBy: user!.uid,
      createdAt: serverTimestamp(),
      type: "hospital_fulfillment"
    };

    try {
      await createClinicalRequest(
        patientId,
        requestedFrom,
        "Pharmacy",
        "Pharmacy",
        {
          drugName,
          dosage,
          quantity,
          unitPrice: item?.unitPrice || 0
        },
        "Routine",
        user!.uid
      );

      await fetchData();
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      // Error handled in helper
    } finally {
      setPrescribing(false);
    }
  }

  if (loading) return <div className="p-10 text-center animate-pulse text-[10px] uppercase font-bold tracking-widest text-slate-400">Syncing Vault...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
       <form onSubmit={handlePrescribe} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
          <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-2">
             <ShoppingCart className="h-4 w-4" /> Rx Fulfillment Entry
          </h4>
          <div className="space-y-4">
             <select name="drugName" required className="w-full h-14 bg-white border border-slate-100 rounded-2xl px-6 text-sm font-bold text-slate-900 outline-none focus:border-indigo-200">
                <option value="">Select Medication...</option>
                {inventory.map(i => <option key={i.id} value={i.name}>{i.name} ({i.stockLevel} units)</option>)}
             </select>
             <input name="dosage" required placeholder="Instruction (e.g. 1g OD x5)" className="w-full h-14 bg-white border border-slate-100 rounded-2xl px-6 text-sm font-bold text-slate-900 outline-none focus:border-indigo-200" />
             <input name="quantity" type="number" required placeholder="Quantity" className="w-full h-14 bg-white border border-slate-100 rounded-2xl px-6 text-sm font-bold text-slate-900 outline-none focus:border-indigo-200" />
          </div>
          <button disabled={prescribing} className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all shadow-premium">
             {prescribing ? "Transmitting..." : "Send to Pharmacy"}
          </button>
       </form>

       <div className="space-y-4 overflow-y-auto max-h-[400px]">
          {orders.map(o => (
             <div key={o.id} className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center justify-between shadow-soft">
                <div>
                   <div className="text-sm font-bold text-slate-900 italic serif">{o.drugName}</div>
                   <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{o.dosage} • {o.status}</div>
                </div>
                <div className={`h-2 w-2 rounded-full ${o.status === 'dispensed' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
             </div>
          ))}
       </div>
    </div>
  );
}

export function InvestigationRequestManager({ patientId, requestedFrom = "General Medicine" }: { patientId: string; requestedFrom?: string }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchHistory();
  }, [patientId]);

  async function fetchHistory() {
    setLoading(true);
    try {
      const q = query(collectionGroup(db, "investigations"), where("patientId", "==", patientId), orderBy("requestedAt", "desc"), limit(10));
      const snap = await getDocs(q);
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const category = formData.get("category") as string;
    const type = formData.get("type") as string;
    const urgency = formData.get("urgency") as string;

    const reqData = {
      patientId,
      category,
      type,
      urgency,
      status: "requested",
      requestedBy: user!.uid,
      requestedAt: serverTimestamp(),
    };

    try {
      await createClinicalRequest(
        patientId,
        requestedFrom, 
        category,
        category as "Laboratory" | "Radiology",
        {
          type,
          urgency
        },
        urgency as "Routine" | "Urgent" | "STAT",
        user!.uid
      );

      await fetchHistory();
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      // Error handled in helper
    } finally {
      setSubmitting(false);
    }
  }

  return (
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <form onSubmit={handleRequest} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
           <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <Microscope className="h-4 w-4" /> Lab & Imaging Request
           </h4>
           <div className="grid grid-cols-2 gap-4">
              <select name="category" required className="bg-white border rounded-2xl h-14 px-4 text-xs font-bold outline-none">
                 <option value="Laboratory">Laboratory</option>
                 <option value="Radiology">Radiology</option>
              </select>
              <select name="urgency" required className="bg-white border rounded-2xl h-14 px-4 text-xs font-bold outline-none">
                 <option value="Routine">Routine</option>
                 <option value="Urgent">Urgent</option>
                 <option value="STAT">STAT</option>
              </select>
           </div>
           <input name="type" required placeholder="Investigation Type (e.g. FBC, CXR...)" className="w-full h-14 bg-white border border-slate-100 rounded-2xl px-6 text-sm font-bold text-slate-900 outline-none" />
           <button disabled={submitting} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all">
              {submitting ? "Broadcasting..." : "Submit Order"}
           </button>
        </form>

        <div className="space-y-4 overflow-y-auto max-h-[400px]">
           {history.map(item => (
              <div key={item.id} className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center justify-between shadow-soft">
                 <div>
                    <div className="text-sm font-bold text-slate-900 italic serif">{item.type}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.category} • {item.urgency}</div>
                 </div>
                 <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{item.status}</div>
              </div>
           ))}
        </div>
     </div>
  );
}
