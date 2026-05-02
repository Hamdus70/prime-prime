import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../portal";
import { db } from "@/lib/firebase";
import { 
  collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, 
  serverTimestamp, orderBy, limit, onSnapshot 
} from "firebase/firestore";
import { 
  Users, Stethoscope, Activity, ClipboardList, Pill, Microscope, 
  Share2, Calendar, Search, Filter, Plus, ChevronRight, CheckCircle, 
  Clock, AlertCircle, Thermometer, UserPlus, Heart, ExternalLink 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";

export const Route = createFileRoute("/portal/staff/family-medicine")({
  component: FamilyMedicinePage,
});

function FamilyMedicinePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Patient Queue");
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [triageData, setTriageData] = useState({
    temp: "",
    bp: "",
    pulse: "",
    weight: "",
    chiefComplaint: "",
    urgency: "Normal"
  });

  const [consultationData, setConsultationData] = useState({
    history: "",
    examination: "",
    diagnosis: "",
    plan: ""
  });

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/portal/auth" });
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      const q = query(collection(db, "patients"), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setPatients(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }, (err) => handleFirestoreError(err, OperationType.LIST, "patients"));
      return () => unsubscribe();
    }
  }, [user]);

  async function fetchProfile() {
    try {
      const profSnap = await getDoc(doc(db, "user_profiles", user!.uid));
      setProfile(profSnap.data());
    } catch (err) {
      console.error(err);
    }
  }

  async function handleTriage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      await addDoc(collection(db, "patients", selectedPatient.id, "vitals"), {
        ...triageData,
        capturedAt: serverTimestamp(),
        capturedBy: user!.uid,
        source: "Family Medicine"
      });
      alert("Triage data recorded successfully.");
      setActiveTab("Consultation");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "vitals");
    }
  }

  async function handleConsultation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      await addDoc(collection(db, "patients", selectedPatient.id, "consultations"), {
        ...consultationData,
        date: serverTimestamp(),
        clinicianId: user!.uid,
        clinicianName: profile?.fullName || "Family Physician",
        department: "Family Medicine"
      });

      // Update patient's primary diagnosis if provided
      if (consultationData.diagnosis) {
        await updateDoc(doc(db, "patients", selectedPatient.id), {
          lastDiagnosis: consultationData.diagnosis,
          lastSeenAt: serverTimestamp()
        });
      }

      alert("Consultation finalized in EMR.");
      setConsultationData({ history: "", examination: "", diagnosis: "", plan: "" });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "consultations");
    }
  }

  async function createClinicalRequest(dept: string, type: string, details: any) {
    if (!selectedPatient) return;
    try {
      if (dept === "Pharmacy") {
        await addDoc(collection(db, "pharmacy_orders"), {
          patientId: selectedPatient.id,
          drugName: details.drug,
          dosage: details.dosage,
          quantity: details.quantity,
          status: "pending",
          prescribedBy: user!.uid,
          createdAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "patients", selectedPatient.id, "investigations"), {
          type: details.type || type,
          category: type,
          status: "requested",
          requestedBy: user!.uid,
          requestedAt: serverTimestamp(),
          clinicalNotes: details.notes
        });
      }

      // Global Notification Alert
      await addDoc(collection(db, "alerts"), {
          patientId: selectedPatient.id,
          type: `${dept.toLowerCase()}_request`,
          message: `FM requested ${dept}: ${details.drug || details.type}`,
          priority: details.priority || "normal",
          status: "active",
          createdAt: serverTimestamp(),
          targetDept: dept.toLowerCase(),
          details
      });

      alert(`${dept} request successfully transmitted.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, dept);
    }
  }

  const filteredPatients = patients.filter(p => 
    p.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
     <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Stethoscope className="h-12 w-12 text-indigo-600 animate-pulse" />
     </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      <div className="max-w-[1600px] mx-auto flex h-screen overflow-hidden">
        
        {/* Navigation Sidebar */}
        <aside className="w-80 border-r border-slate-100 bg-white flex flex-col p-8 shrink-0">
           <div className="mb-12">
              <div className="h-16 w-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-premium mb-6">
                 <Stethoscope className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 italic serif">Family Medicine</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Primary Care Engine</p>
           </div>

           <nav className="space-y-2 flex-1">
              {[
                { id: "Patient Queue", icon: Users },
                { id: "Consultation", icon: Stethoscope },
                { id: "Investigations", icon: Microscope },
                { id: "Prescriptions", icon: Pill },
                { id: "Referrals", icon: Share2 },
                { id: "Follow-Up", icon: Calendar }
              ].map(tab => (
                 <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === tab.id ? "bg-indigo-50 text-indigo-600 shadow-sm" : "text-slate-400 hover:bg-slate-50"}`}
                 >
                    <tab.icon className="h-4 w-4" />
                    {tab.id}
                 </button>
              ))}
           </nav>

           <div className="pt-8 border-t border-slate-100">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                 <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <UserPlus className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-bold text-slate-900 uppercase">Today's Load</p>
                    <p className="text-xs text-slate-400">{patients.length} Registered</p>
                 </div>
              </div>
           </div>
        </aside>

        {/* Workspace */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
           
           {/* Header Area */}
           <header className="h-24 bg-white border-b border-slate-100 flex items-center justify-between px-10 shrink-0">
              <div className="flex-1 relative max-w-xl">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                 <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Identify patient by name or ID..." 
                  className="w-full pl-12 pr-6 h-12 bg-slate-50 rounded-xl border-transparent focus:bg-white focus:border-indigo-100 outline-none transition-all text-sm font-medium"
                 />
              </div>
              <div className="flex items-center gap-10">
                 <div className="text-right">
                    <div className="text-xs font-bold text-slate-900 italic serif">Dr. {profile?.fullName || 'Physician'}</div>
                    <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">GP Core Active</div>
                 </div>
                 <div className="h-12 w-12 bg-slate-900 rounded-2xl shadow-premium flex items-center justify-center text-white italic serif">PV</div>
              </div>
           </header>

           {/* Dynamic Dashboard/View */}
           <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
              <AnimatePresence mode="wait">
                 
                 {activeTab === "Patient Queue" && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                       {filteredPatients.map((p, idx) => (
                          <div 
                            key={p.id} 
                            onClick={() => setSelectedPatient(p)}
                            className={`p-8 rounded-[2.5rem] bg-white border transition-all cursor-pointer group ${selectedPatient?.id === p.id ? 'border-indigo-600 shadow-clinical' : 'border-slate-100 hover:border-slate-200'}`}
                          >
                             <div className="flex items-start justify-between mb-6">
                                <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                   <Users className="h-8 w-8" />
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${p.urgency === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                                   {p.urgency || 'Normal'}
                                </div>
                             </div>
                             <h4 className="text-xl font-bold text-slate-900 italic serif truncate mb-1">{p.fullName}</h4>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{p.id.slice(0, 12)}</p>
                             
                             <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                                <Activity className="h-4 w-4 opacity-30" /> 
                                <span>Wait Time: {Math.floor(Math.random() * 20)}m</span>
                             </div>
                          </div>
                       ))}
                    </motion.div>
                 )}

                 {activeTab === "Consultation" && selectedPatient && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">
                       <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-clinical">
                          <div className="flex items-center gap-6 mb-10 pb-8 border-b border-slate-100">
                             <div className="h-20 w-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                                <Users className="h-10 w-10" />
                             </div>
                             <div>
                                <h2 className="text-3xl font-bold text-slate-900 italic serif">{selectedPatient.fullName}</h2>
                                <div className="flex items-center gap-4 mt-2">
                                   <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase">{selectedPatient.gender}</span>
                                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Age: {selectedPatient.age || 'N/A'}</span>
                                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MRN: {selectedPatient.id.slice(-8)}</span>
                                </div>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                             <form onSubmit={handleTriage} className="space-y-8">
                                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] flex items-center gap-3">
                                   <Thermometer className="h-4 w-4" /> Triage Integration
                                </h3>
                                <div className="grid grid-cols-2 gap-6">
                                   <div className="space-y-2">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4">Weight (kg)</label>
                                      <input 
                                        value={triageData.weight} 
                                        onChange={e => setTriageData({...triageData, weight: e.target.value})}
                                        className="w-full h-14 bg-slate-50 rounded-2xl px-6 font-bold outline-none border border-transparent shadow-inner focus:border-indigo-100" 
                                      />
                                   </div>
                                   <div className="space-y-2">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4">Blood Pressure</label>
                                      <input 
                                        value={triageData.bp} 
                                        onChange={e => setTriageData({...triageData, bp: e.target.value})}
                                        placeholder="120/80" 
                                        className="w-full h-14 bg-slate-50 rounded-2xl px-6 font-bold outline-none border border-transparent shadow-inner focus:border-indigo-100" 
                                      />
                                   </div>
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4">Chief Complaint</label>
                                   <textarea 
                                      value={triageData.chiefComplaint}
                                      onChange={e => setTriageData({...triageData, chiefComplaint: e.target.value})}
                                      className="w-full h-32 bg-slate-50 rounded-2xl p-6 font-medium outline-none border border-transparent shadow-inner focus:border-indigo-100" 
                                   />
                                </div>
                                <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-bold uppercase text-[10px] tracking-widest shadow-premium hover:shadow-glow transition-all">Record Vitals & Start Consultation</button>
                             </form>

                             <form onSubmit={handleConsultation} className="space-y-8">
                                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] flex items-center gap-3">
                                   <ClipboardList className="h-4 w-4" /> Clinical Documentation
                                </h3>
                                <div className="space-y-6">
                                   <div className="space-y-2">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4">History & Examination</label>
                                      <textarea 
                                        value={consultationData.history}
                                        onChange={e => setConsultationData({...consultationData, history: e.target.value})}
                                        className="w-full h-40 bg-slate-50 rounded-2xl p-6 font-medium outline-none border border-transparent shadow-inner focus:border-indigo-100" 
                                      />
                                   </div>
                                   <div className="space-y-2">
                                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4">Provisional Diagnosis</label>
                                      <input 
                                        value={consultationData.diagnosis}
                                        onChange={e => setConsultationData({...consultationData, diagnosis: e.target.value})}
                                        placeholder="e.g. Community Acquired Pneumonia" 
                                        className="w-full h-14 bg-slate-50 rounded-2xl px-6 font-bold outline-none border border-transparent shadow-inner focus:border-indigo-100" 
                                      />
                                   </div>
                                </div>
                                <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-bold uppercase text-[10px] tracking-widest shadow-premium hover:shadow-glow transition-all flex items-center justify-center gap-3">
                                   <CheckCircle className="h-4 w-4" /> Finalize Consultation
                                </button>
                             </form>
                          </div>
                       </div>
                    </motion.div>
                 )}

                 {activeTab === "Investigations" && selectedPatient && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <RequestCard 
                             title="Laboratory Diagnostics"
                             description="Pathology, Microbiology, Biochemistry"
                             icon={Microscope}
                             color="bg-emerald-500"
                             onSubmit={(details) => createClinicalRequest("Laboratory", "lab", details)}
                             fields={[
                                { name: "type", label: "Test Type (e.g. FBC, LFT)", type: "text" },
                                { name: "notes", label: "Clinical Indication", type: "textarea" },
                                { name: "priority", label: "Priority", type: "select", options: ["Normal", "Urgent", "Emergency"] }
                             ]}
                          />
                          <RequestCard 
                             title="Radiology Imaging"
                             description="X-Ray, Ultrasound, CT, MRI"
                             icon={Activity}
                             color="bg-blue-500"
                             onSubmit={(details) => createClinicalRequest("Radiology", "imaging", details)}
                             fields={[
                                { name: "type", label: "Imaging Modality", type: "text" },
                                { name: "notes", label: "Area of Interest", type: "textarea" },
                                { name: "priority", label: "Priority", type: "select", options: ["Normal", "Urgent", "Emergency"] }
                             ]}
                          />
                       </div>
                    </motion.div>
                 )}

                 {activeTab === "Prescriptions" && selectedPatient && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                       <RequestCard 
                          title="Pharmacy Order"
                          description="Electronic Prescription Fulfillment"
                          icon={Pill}
                          color="bg-indigo-600"
                          onSubmit={(details) => createClinicalRequest("Pharmacy", "drug", details)}
                          fields={[
                             { name: "drug", label: "Medication Name", type: "text" },
                             { name: "dosage", label: "Dosage (e.g. 500mg TDS)", type: "text" },
                             { name: "quantity", label: "Quantity / Duration", type: "number" },
                             { name: "notes", label: "Administration Notes", type: "textarea" }
                          ]}
                       />
                    </motion.div>
                 )}

                 {activeTab === "Referrals" && selectedPatient && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <div className="bg-white rounded-[3rem] p-12 border border-slate-200 shadow-clinical max-w-3xl mx-auto">
                           <div className="flex items-center gap-6 mb-10">
                              <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center">
                                 <Share2 className="h-8 w-8" />
                              </div>
                              <div>
                                 <h2 className="text-2xl font-bold text-slate-900 italic serif">Specialist Referral</h2>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Inter-departmental Clinical Handoff</p>
                              </div>
                           </div>
                           <ReferralForm patientId={selectedPatient.id} user={user} onComplete={() => alert("Referral Sent.")} />
                        </div>
                    </motion.div>
                 )}

                 {activeTab === "Follow-Up" && selectedPatient && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <div className="bg-[#0f172a] rounded-[3rem] p-12 text-white shadow-premium max-w-2xl mx-auto text-center">
                           <Calendar className="h-16 w-16 text-indigo-400 mx-auto mb-8" />
                           <h2 className="text-3xl font-bold italic serif mb-4">Patient Re-evaluation</h2>
                           <p className="text-indigo-200 text-sm mb-10">Define a timeframe for clinical review and monitoring.</p>
                           <form className="space-y-6 text-left">
                              <div className="grid grid-cols-2 gap-6">
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Follow-up Date</label>
                                    <input type="date" className="w-full h-14 bg-white/10 rounded-2xl px-6 font-bold text-white outline-none border border-white/10" />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Review Purpose</label>
                                    <select className="w-full h-14 bg-white/10 rounded-2xl px-6 font-bold text-white outline-none border border-white/10">
                                       <option>Chronic Monitoring</option>
                                       <option>Post-Acute Review</option>
                                       <option>Laboratory Review</option>
                                       <option>Medication Adjustment</option>
                                    </select>
                                 </div>
                              </div>
                              <button className="w-full h-16 bg-indigo-600 rounded-[2rem] font-bold uppercase tracking-widest text-[11px] shadow-glow hover:bg-indigo-700 transition-all">Schedule Integration Node</button>
                           </form>
                        </div>
                    </motion.div>
                 )}

                 {!selectedPatient && (
                    <div className="h-full flex items-center justify-center">
                       <div className="text-center opacity-30">
                          <Heart className="h-20 w-20 mx-auto mb-6 animate-pulse" />
                          <p className="text-xl italic serif font-bold">Select an ID from the Queue to begin Clinical Protocol</p>
                          <p className="text-[10px] uppercase tracking-[0.4em] mt-4 font-bold">Patient-Centric Coordination System</p>
                       </div>
                    </div>
                 )}

              </AnimatePresence>
           </div>
        </main>
      </div>
    </div>
  );
}

function RequestCard({ title, description, icon: Icon, color, fields, onSubmit }: any) {
   const [data, setData] = useState<any>({});

   const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(data);
      e.currentTarget.dispatchEvent(new Event('reset'));
      setData({});
   };

   return (
      <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-clinical">
         <div className="flex items-center gap-6 mb-8">
            <div className={`h-16 w-16 ${color} text-white rounded-3xl flex items-center justify-center shadow-premium`}>
               <Icon className="h-8 w-8" />
            </div>
            <div>
               <h3 className="text-xl font-bold text-slate-900 italic serif">{title}</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{description}</p>
            </div>
         </div>
         <form onSubmit={handleSubmit} className="space-y-6">
            {fields.map((f: any) => (
               <div key={f.name} className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4">{f.label}</label>
                  {f.type === 'textarea' ? (
                     <textarea 
                        onChange={e => setData({...data, [f.name]: e.target.value})}
                        className="w-full h-24 bg-slate-50 rounded-2xl p-6 text-sm font-medium outline-none border border-transparent shadow-inner focus:border-indigo-100" 
                     />
                  ) : f.type === 'select' ? (
                     <select 
                        onChange={e => setData({...data, [f.name]: e.target.value})}
                        className="w-full h-14 bg-slate-50 rounded-2xl px-6 font-bold text-sm outline-none border border-transparent shadow-inner focus:border-indigo-100"
                     >
                        {f.options.map((opt: string) => <option key={opt}>{opt}</option>)}
                     </select>
                  ) : (
                     <input 
                        type={f.type}
                        onChange={e => setData({...data, [f.name]: e.target.value})}
                        className="w-full h-14 bg-slate-50 rounded-2xl px-6 font-bold text-sm outline-none border border-transparent shadow-inner focus:border-indigo-100" 
                     />
                  )}
               </div>
            ))}
            <button type="submit" className={`w-full py-5 ${color} text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-premium hover:shadow-glow transition-all`}>
               Transmit Transact Order
            </button>
         </form>
      </div>
   );
}

function ReferralForm({ patientId, user, onComplete }: any) {
   async function handleReferral(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const targetDept = formData.get("targetDept") as string;
      const reason = formData.get("reason") as string;

      try {
         await addDoc(collection(db, "alerts"), {
            patientId,
            type: "specialist_referral",
            message: `FM Referral to ${targetDept}: ${reason}`,
            priority: "normal",
            status: "active",
            createdAt: serverTimestamp(),
            targetDept: targetDept.toLowerCase(),
            referredBy: user!.uid
         });
         onComplete();
         (e.target as HTMLFormElement).reset();
      } catch (err) {
         handleFirestoreError(err, OperationType.CREATE, "referrals");
      }
   }

   return (
      <form onSubmit={handleReferral} className="space-y-8">
         <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Target Department</label>
            <select name="targetDept" required className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-sm font-bold text-slate-900 outline-none">
               <option value="InternalMedicine">Internal Medicine</option>
               <option value="Surgery">General Surgery</option>
               <option value="Paediatrics">Paediatrics</option>
               <option value="Obstetrics">Obstetrics & Gynaecology</option>
               <option value="Orthopaedics">Orthopaedics</option>
            </select>
         </div>
         <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Reason for Referral</label>
            <textarea name="reason" required className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 text-sm font-medium outline-none h-40" placeholder="Clinical history and specific consult reason..." />
         </div>
         <button className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-indigo-700 shadow-premium transition-all">Submit Handoff Order</button>
      </form>
   );
}

