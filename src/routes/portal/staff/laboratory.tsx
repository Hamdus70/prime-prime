import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../portal";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp, orderBy, limit, collectionGroup } from "firebase/firestore";
import { Microscope, Activity, Search, Filter, Plus, ChevronRight, Droplets, Thermometer, Database, CheckCircle, Clock, AlertCircle, TrendingUp, FlaskConical, Beaker, Archive, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";

export const Route = createFileRoute("/portal/staff/laboratory")({
  component: LaboratoryPage,
});

function LaboratoryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Queue");

  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/portal/auth" });
  }, [user, authLoading]);

  useEffect(() => {
    if (user) fetchInitialData();
  }, [user]);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const profSnap = await getDoc(doc(db, "user_profiles", user!.uid));
      setProfile(profSnap.data());

      const q = query(collectionGroup(db, "investigations"), orderBy("requestedAt", "desc"), limit(30));
      const iSnap = await getDocs(q);
      setInvestigations(iSnap.docs.map(d => ({ 
        id: d.id, 
        patientId: d.ref.parent.parent?.id,
        ...d.data() 
      })));
    } catch (err) {
      console.error("Lab Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const checkAlerts = async () => {
      const now = new Date().getTime();
      const twelveHours = 12 * 60 * 60 * 1000;
      const twentyFourHours = 24 * 60 * 60 * 1000;

      for (const inv of investigations) {
        if (!inv.requestedAt) continue;
        const requestedTime = inv.requestedAt.seconds * 1000;
        
        if (inv.status === 'requested' && (now - requestedTime) > twelveHours) {
          // Trigger Pending Alert if not already active
          await addDoc(collection(db, "alerts"), {
            patientId: inv.patientId,
            type: "pending_lab",
            message: `STALE REQUEST: ${inv.type} pending for >12h`,
            priority: "high",
            status: "active",
            createdAt: serverTimestamp(),
            targetDept: "lab"
          });
        }

        if (inv.status === 'sampled' && (now - requestedTime) > twentyFourHours) {
          await addDoc(collection(db, "alerts"), {
            patientId: inv.patientId,
            type: "delayed_result",
            message: `DELAYED RESULT: ${inv.type} result overdue (>24h)`,
            priority: "high",
            status: "active",
            createdAt: serverTimestamp(),
            targetDept: "lab"
          });
        }
      }
    };

    if (investigations.length > 0) checkAlerts();
  }, [investigations]);

  async function updateRequestStatus(invId: string, patientId: string, status: string, resultData?: any) {
    if (!profile) return;
    try {
      const fieldUpdates: any = {
        status,
        updatedAt: serverTimestamp()
      };

      if (status === 'sampled') {
        fieldUpdates.collectedAt = serverTimestamp();
        fieldUpdates.collectedBy = user!.uid;
        fieldUpdates.technicianName = profile.fullName || profile.name || "Lab Tech";
      }

      if (status === 'completed' && resultData) {
        fieldUpdates.resultedAt = serverTimestamp();
        fieldUpdates.resultedBy = user!.uid;
        fieldUpdates.findings = resultData.summary;
        fieldUpdates.parameters = resultData.parameters;

        // Billing Integration: Create pending invoice upon completion
        await addDoc(collection(db, "payments"), {
          patientId,
          amount: 75.00, // Placeholder base diagnostic fee
          description: `Laboratory Diagnostic: ${selectedRequest?.type || 'Investigation'}`,
          status: "pending",
          dueDate: serverTimestamp(),
          type: "invoice",
          createdAt: serverTimestamp(),
          source: "laboratory",
          requestId: invId
        });
      }

      await updateDoc(doc(db, "patients", patientId, "investigations", invId), fieldUpdates);
      
      if (status === 'completed') {
         await addDoc(collection(db, "alerts"), {
            patientId,
            type: "lab_result_ready",
            message: `Result ready for ${fieldUpdates.findings || 'Investigation'}`,
            priority: "normal",
            status: "active",
            createdAt: serverTimestamp(),
            targetDept: "doctor"
         });
      }

      await fetchInitialData();
      setShowResultModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `patients/${patientId}/investigations/${invId}`);
    }
  }

  if (loading) return <div className="p-20 text-center animate-pulse italic">Connecting to Diagnostic Cloud...</div>;

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      <div className="bg-[#0f172a] h-[350px] absolute top-0 left-0 w-full z-0" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-12">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-premium transform -rotate-6">
              <FlaskConical className="h-10 w-10 rotate-6" />
            </div>
            <div>
               <div className="flex items-center gap-3 text-emerald-400 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Pathology & Diagnostics</span>
                  <div className="h-1 w-8 bg-emerald-400/20" />
               </div>
               <h1 className="text-4xl font-bold text-white tracking-tight italic serif">Diagnostic Operations Node</h1>
            </div>
          </div>
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
             {["Queue", "In-Process", "Archive"].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-10 py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? "bg-emerald-500 text-white shadow-premium" : "text-white/40 hover:text-white"}`}
                >
                  {tab}
                </button>
             ))}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 relative z-10">
           <LabMetric label="Pending Requests" val={investigations.filter(i => i.status === 'requested').length} icon={ClipboardList} color="text-amber-400" />
           <LabMetric label="In-Process" val={investigations.filter(i => i.status === 'sampled' || i.status === 'processing').length} icon={Activity} color="text-blue-400" />
           <LabMetric label="Completed (24h)" val={investigations.filter(i => i.status === 'completed').length} icon={CheckCircle} color="text-emerald-400" />
           <LabMetric label="Instrumentation" val="4/4 Online" icon={Database} color="text-slate-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
          <main className="space-y-8">
             <div className="bg-white rounded-[3rem] p-10 shadow-premium border border-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8">
                   <Microscope className="h-20 w-20 text-slate-50" />
                </div>
                <div className="flex flex-col md:flex-row gap-6 mb-12 relative z-10">
                    <div className="flex-1 relative">
                       <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                       <input placeholder="Identify test request..." className="w-full pl-14 pr-6 h-14 bg-slate-50 rounded-2xl border-transparent focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-50 outline-none transition-all font-medium" />
                    </div>
                </div>

                 <div className="space-y-4 relative z-10">
                   {investigations.filter(i => {
                      if (activeTab === "Queue") return i.status === 'requested';
                      if (activeTab === "In-Process") return i.status === 'sampled' || i.status === 'processing';
                      return i.status === 'completed';
                   }).map((inv, idx) => (
                      <LabRequestCard 
                        key={inv.id} 
                        inv={inv} 
                        idx={idx} 
                        onStatusUpdate={(status) => {
                           if (status === 'completed') {
                              setSelectedRequest(inv);
                              setShowResultModal(true);
                           } else {
                              updateRequestStatus(inv.id, inv.patientId, status);
                           }
                        }}
                      />
                   ))}
                   {investigations.length === 0 && (
                      <div className="p-32 text-center">
                         <div className="h-16 w-16 bg-slate-50 text-slate-200 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
                            <Beaker className="h-8 w-8" />
                         </div>
                         <p className="text-sm font-bold text-slate-400 uppercase tracking-widest italic opacity-50">No diagnostic requests localized.</p>
                      </div>
                   )}
                </div>
             </div>
          </main>

          <aside className="space-y-8">
             <div className="bg-white rounded-[3rem] p-8 border border-white shadow-clinical">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-10">Instrumentation Status</h4>
                <div className="space-y-6">
                   <InstrumentStatus label="Hematology Analyzer" status="online" load={42} color="bg-emerald-500" />
                   <InstrumentStatus label="Biochemical Node-X" status="online" load={18} color="bg-emerald-500" />
                   <InstrumentStatus label="Centrifuge Base A" status="warning" load={95} color="bg-amber-500" />
                   <InstrumentStatus label="Deep Freeze Storage" status="critical" load={99} color="bg-rose-500" />
                </div>
             </div>

             <div className="bg-emerald-600 rounded-[3rem] p-10 text-white shadow-premium relative overflow-hidden group">
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-full -mb-20 -mr-10 blur-3xl group-hover:bg-white/20 transition-colors duration-700" />
                <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40 mb-10">Department Vitals</h4>
                <div className="space-y-8 relative z-10">
                   <div>
                      <div className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mb-1">Results Sync Rate</div>
                      <div className="text-4xl font-bold font-display tracking-tight">99.8%</div>
                   </div>
                   <div className="h-px bg-white/10" />
                   <div>
                      <div className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mb-1">Samples Processed</div>
                      <div className="text-2xl font-bold font-display italic serif">1,402 <span className="text-xs opacity-40 uppercase">This Month</span></div>
                   </div>
                   <button className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border border-emerald-500/30">
                      Download KPI Report
                   </button>
                </div>
             </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {showResultModal && (
          <ResultEntryModal 
            onClose={() => setShowResultModal(false)}
            onSave={(data) => updateRequestStatus(selectedRequest.id, selectedRequest.patientId, 'completed', data)}
            title={selectedRequest?.type}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultEntryModal({ onClose, onSave, title }: any) {
   const [parameters, setParameters] = useState<any[]>([{ parameter: "", value: "", unit: "", refRange: "", abnormal: false }]);
   const [summary, setSummary] = useState("");

   const addField = () => setParameters([...parameters, { parameter: "", value: "", unit: "", refRange: "", abnormal: false }]);
   
   const updateField = (idx: number, field: string, val: any) => {
      const next = [...parameters];
      next[idx][field] = val;
      setParameters(next);
   };

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
         <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-sm"
         />
         <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-heavy overflow-hidden"
         >
            <div className="p-10 border-b border-slate-100 flex items-center justify-between">
               <div>
                  <h3 className="text-2xl font-bold text-slate-900 italic serif">Pathology Output: {title}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Structured Parameter Entry</p>
               </div>
               <button onClick={onClose} className="h-12 w-12 rounded-2xl hover:bg-slate-50 flex items-center justify-center transition-colors">
                  <Archive className="h-5 w-5 text-slate-400" />
               </button>
            </div>

            <div className="p-10 space-y-10 max-h-[60vh] overflow-y-auto no-scrollbar">
               <div className="space-y-6">
                  {parameters.map((p, idx) => (
                     <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px_150px_60px] gap-4 items-end">
                        <div className="space-y-2">
                           {idx === 0 && <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4">Parameter</label>}
                           <input 
                              value={p.parameter}
                              onChange={(e) => updateField(idx, "parameter", e.target.value)}
                              placeholder="e.g. Haemoglobin" 
                              className="w-full h-12 bg-slate-50 rounded-xl px-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-50 border border-slate-100" 
                           />
                        </div>
                        <div className="space-y-2">
                           {idx === 0 && <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4">Value</label>}
                           <input 
                              value={p.value}
                              onChange={(e) => updateField(idx, "value", e.target.value)}
                              placeholder="14.2" 
                              className="w-full h-12 bg-slate-50 rounded-xl px-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-50 border border-slate-100" 
                           />
                        </div>
                        <div className="space-y-2">
                           {idx === 0 && <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4">Unit</label>}
                           <input 
                              value={p.unit}
                              onChange={(e) => updateField(idx, "unit", e.target.value)}
                              placeholder="g/dL" 
                              className="w-full h-12 bg-slate-50 rounded-xl px-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-50 border border-slate-100" 
                           />
                        </div>
                        <div className="space-y-2">
                           {idx === 0 && <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4">Ref Range</label>}
                           <input 
                              value={p.refRange}
                              onChange={(e) => updateField(idx, "refRange", e.target.value)}
                              placeholder="13.5-17.5" 
                           className="w-full h-12 bg-slate-50 rounded-xl px-5 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-50 border border-slate-100" 
                           />
                        </div>
                        <div className="flex flex-col items-center gap-2">
                           {idx === 0 && <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Flag</label>}
                           <button 
                             onClick={() => updateField(idx, "abnormal", !p.abnormal)}
                             className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${p.abnormal ? 'bg-rose-500 text-white shadow-glow' : 'bg-slate-100 text-slate-400 hover:bg-rose-50'}`}
                           >
                              <AlertCircle className="h-4 w-4" />
                           </button>
                        </div>
                     </div>
                  ))}
               </div>

               <button 
                  onClick={addField}
                  className="w-full py-4 border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:border-emerald-200 hover:text-emerald-500 transition-all flex items-center justify-center gap-3"
               >
                  <Plus className="h-4 w-4" /> Add Parameter Input
               </button>

               <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-6">Technician Impression / Summary</label>
                  <textarea 
                     value={summary}
                     onChange={(e) => setSummary(e.target.value)}
                     placeholder="Enter overall lab findings..." 
                     className="w-full h-32 bg-slate-50 rounded-[2rem] p-8 text-sm font-bold outline-none border border-slate-100 focus:ring-4 focus:ring-emerald-50 shadow-inner"
                  />
               </div>
            </div>

            <div className="p-10 bg-slate-50 flex items-center justify-between">
               <button onClick={onClose} className="px-10 h-16 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all">Cancel</button>
               <button 
                  onClick={() => onSave({ parameters, summary })}
                  className="px-12 h-16 bg-emerald-600 text-white rounded-[2rem] font-bold uppercase text-[10px] tracking-[0.3em] shadow-premium hover:shadow-glow transition-all flex items-center gap-4"
               >
                  <CheckCircle className="h-4 w-4" /> Finalize Diagnostic Record
               </button>
            </div>
         </motion.div>
      </div>
   );
}

function LabRequestCard({ inv, idx, onStatusUpdate }: any) {
   const statusConfig: any = {
      requested: { label: "Requested", color: "bg-amber-50 text-amber-600 border-amber-100", next: "sampled", nextLabel: "Collect Sample" },
      sampled: { label: "Sampled", color: "bg-blue-50 text-blue-600 border-blue-100", next: "processing", nextLabel: "Start Processing" },
      processing: { label: "Processing", color: "bg-indigo-50 text-indigo-600 border-indigo-100 animate-pulse", next: "completed", nextLabel: "Post Result" },
      completed: { label: "Completed", color: "bg-emerald-50 text-emerald-600 border-emerald-100", next: null }
   };

   const config = statusConfig[inv.status] || statusConfig.requested;

   return (
      <motion.div 
         initial={{ opacity: 0, x: -20 }}
         animate={{ opacity: 1, x: 0 }}
         transition={{ delay: idx * 0.05 }}
         className="p-6 rounded-3xl bg-slate-50 hover:bg-white border border-transparent hover:border-emerald-100 transition-all group flex items-center justify-between"
      >
         <div className="flex items-center gap-6">
            <div className="h-14 w-14 bg-white rounded-2xl shadow-soft border border-slate-100 flex items-center justify-center text-emerald-600 transition-transform group-hover:scale-110">
               <Droplets className="h-6 w-6" />
            </div>
            <div>
               <div className="flex items-center gap-3 mb-1">
                  <h4 className="text-lg font-bold text-slate-900 italic serif">{inv.type}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-600 rounded uppercase tracking-widest">{inv.category}</span>
               </div>
               <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>PATIENT: {inv.patientId?.slice(-6).toUpperCase()}</span>
                  <div className="h-1 w-1 bg-slate-300 rounded-full" />
                  <span>REQ BY: {inv.requestedBy?.slice(-6).toUpperCase()}</span>
                  <div className="h-1 w-1 bg-slate-300 rounded-full" />
                  <span>{inv.requestedAt ? new Date(inv.requestedAt.seconds * 1000).toLocaleTimeString() : 'N/A'}</span>
                  {inv.technicianName && (
                     <>
                        <div className="h-1 w-1 bg-slate-300 rounded-full" />
                        <span className="text-emerald-500">TECH: {inv.technicianName}</span>
                     </>
                  )}
                  {inv.collectedAt && (
                     <>
                        <div className="h-1 w-1 bg-slate-300 rounded-full" />
                        <span className="text-blue-500">COLL: {new Date(inv.collectedAt.seconds * 1000).toLocaleTimeString()}</span>
                     </>
                  )}
               </div>
            </div>
         </div>
         <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${config.color}`}>
               {config.label}
            </div>
            {config.next && (
               <button 
                  onClick={() => onStatusUpdate(config.next)}
                  className="px-6 h-12 rounded-xl bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-premium whitespace-nowrap"
               >
                  {config.nextLabel}
               </button>
            )}
            {inv.status === 'completed' && (
               <button className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-premium">
                  <CheckCircle className="h-5 w-5" />
               </button>
            )}
         </div>
      </motion.div>
   );
}

function LabMetric({ label, val, icon: Icon, color }: any) {
  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-[2rem] p-6 flex items-center gap-6 transition-all hover:bg-white/10">
       <div className={`h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center ${color}`}>
          <Icon className="h-6 w-6" />
       </div>
       <div>
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mb-1">{label}</div>
          <div className="text-2xl font-bold text-white font-display leading-none">{val}</div>
       </div>
    </div>
  );
}

function InstrumentStatus({ label, status, load, color }: any) {
   return (
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
         <div className="flex justify-between items-center mb-3">
            <div className="text-[11px] font-bold text-slate-900 italic serif">{label}</div>
            <div className={`h-1.5 w-1.5 rounded-full ${color} animate-pulse shadow-[0_0_8px] shadow-current`} />
         </div>
         <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full ${color}`} style={{ width: `${load}%` }} />
         </div>
         <div className="flex justify-between mt-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{status}</span>
            <span className="text-[9px] font-bold text-slate-900 tracking-wider">{load}% LOAD</span>
         </div>
      </div>
   );
}
