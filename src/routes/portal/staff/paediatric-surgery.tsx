import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../portal";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { 
  Baby, Stethoscope, Activity, Plus, ChevronLeft, ChevronRight, 
  Search, ClipboardList, AlertCircle, Heart, Star, 
  Microscope, Pill, Clock, ShieldCheck, Activity as Pulse,
  CheckCircle2, Zap, Database, Calendar, User, Scale, Thermometer,
  Milk, Shell
} from "lucide-react";
import { InvestigationRequestManager, PrescriptionManager } from "@/components/ClinicalRequests";
import { motion, AnimatePresence } from "motion/react";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";

export const Route = createFileRoute("/portal/staff/paediatric-surgery")({
  component: PaediatricSurgeryDepartmentPage,
});

interface PaediatricCase {
   id: string;
   patientId: string;
   patientName: string;
   guardianName: string;
   age: string;
   weight: string;
   procedureType: string;
   status: "Pre-Operative" | "Intra-Operative" | "Post-Operative" | "Completed";
   urgency: "Elective" | "Emergency" | "Neonatal Priority";
   subspecialty: "Neonatal" | "General Paediatric" | "Trauma";
   theatreId?: string;
   assignedSurgeonName: string;
   birthWeight?: string;
   apgarScore?: string;
   conditionDetails: string;
   createdAt: any;
}

function PaediatricSurgeryDepartmentPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [cases, setCases] = useState<PaediatricCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [selectedCase, setSelectedCase] = useState<PaediatricCase | null>(null);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/portal/auth" });
  }, [user, authLoading]);

  useEffect(() => {
    if (user) fetchInitialData();
  }, [user]);

  async function fetchInitialData() {
    setLoading(true);
    try {
      if (!user) return;
      const profSnap = await getDoc(doc(db, "user_profiles", user.uid));
      setProfile(profSnap.data());
      await Promise.all([fetchCases(), fetchReferrals()]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchReferrals() {
     try {
        const q = query(collection(db, "referrals"), where("targetDept", "==", "Paediatric Surgery"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
     } catch (err) {
        console.error(err);
     }
  }

  async function fetchCases() {
    try {
      const q = query(collection(db, "paediatric_surgery_cases"), orderBy("createdAt", "desc"), limit(50));
      const snap = await getDocs(q);
      setCases(snap.docs.map(d => ({ id: d.id, ...d.data() } as PaediatricCase)));
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
      <Baby className="h-12 w-12 text-blue-500 animate-bounce" />
      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400">Synchronizing Paediatric Surgical Node...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="bg-white border-b border-slate-200 p-8 md:p-12 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          <div>
            <div className="flex items-center gap-4 text-blue-500 mb-6">
              <Link to="/portal/staff" className="text-slate-400 hover:text-blue-500 transition-colors">
                <ChevronLeft className="h-6 w-6" />
              </Link>
              <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center">
                 <Stethoscope className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.4em]">Paediatric Surgery Unit</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-slate-900 mb-4 italic serif">Tiny Lives <br />Major Procedures</h1>
            <p className="text-slate-400 font-medium max-w-lg">Advanced surgical management for neonates and children with integrated multi-department coordination.</p>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-[2.5rem] border border-slate-200 shadow-inner">
             {["Dashboard", "Neonatal", "General", "Emergency", "Theatre", "Referrals"].map(tab => (
                <button 
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSelectedCase(null); }}
                  className={`px-8 py-4 rounded-[2rem] text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? "bg-white text-blue-600 shadow-soft border border-slate-100" : "text-slate-400 hover:text-slate-600"}`}
                >
                  {tab}
                </button>
             ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-16">
        <AnimatePresence mode="wait">
          {selectedCase ? (
            <SurgicalCaseView 
              key="case-view"
              caseData={selectedCase} 
              onBack={() => setSelectedCase(null)} 
              refresh={fetchCases}
              setSelectedCase={setSelectedCase}
            />
          ) : activeTab === "Dashboard" ? (
            <div className="space-y-16">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <StatCard label="Active Cases" val={cases.filter(c => c.status !== "Completed").length} icon={Activity} color="blue" />
                  <StatCard label="Neonatal Priority" val={cases.filter(c => c.subspecialty === "Neonatal" && c.status !== "Completed").length} icon={Baby} color="amber" />
                  <StatCard label="Emergency Operative" val={cases.filter(c => c.urgency === "Emergency").length} icon={Zap} color="rose" />
                  <StatCard label="Theatre Utilization" val="84%" icon={Clock} color="indigo" />
               </div>

               <div className="space-y-8">
                  <div className="flex items-center justify-between">
                     <h2 className="text-3xl font-bold text-slate-900 italic serif">Surgical Active Roster</h2>
                     <button 
                        onClick={() => setShowNewCaseModal(true)}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl flex items-center gap-3 hover:bg-blue-600 transition-all group"
                     >
                        <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Enlist New Surgical Case</span>
                     </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {cases.map((c, i) => (
                        <CaseCard key={c.id} c={c} idx={i} onClick={() => setSelectedCase(c)} />
                     ))}
                  </div>
               </div>
            </div>
          ) : activeTab === "Neonatal" ? (
             <div className="space-y-12">
                <div className="p-20 text-center bg-white rounded-[4rem] border border-slate-100 shadow-premium relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-20" />
                   <Baby className="h-16 w-16 text-blue-400 mx-auto mb-8" />
                   <h2 className="text-4xl font-bold text-slate-900 italic serif mb-4">Neonatal Surgical Suite</h2>
                   <p className="text-slate-400 max-w-md mx-auto">High-precision intervention for newborn congenital and emergency conditions.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {cases.filter(c => c.subspecialty === "Neonatal").map((c, i) => (
                      <CaseCard key={c.id} c={c} idx={i} onClick={() => setSelectedCase(c)} />
                   ))}
                </div>
             </div>
          ) : activeTab === "Emergency" ? (
            <div className="space-y-12">
               <div className="p-20 text-center bg-rose-50 rounded-[4rem] border border-rose-100 shadow-premium">
                  <Zap className="h-16 w-16 text-rose-500 mx-auto mb-8 animate-pulse" />
                  <h2 className="text-4xl font-bold text-rose-900 italic serif mb-4">Paediatric Trauma & Emergency</h2>
                  <p className="text-rose-600/60 max-w-md mx-auto">Critical priority cases bypassing standard queues for immediate resuscitation and surgery.</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {cases.filter(c => c.urgency === "Emergency").map((c, i) => (
                     <CaseCard key={c.id} c={c} idx={i} onClick={() => setSelectedCase(c)} />
                  ))}
               </div>
            </div>
          ) : activeTab === "Referrals" ? (
             <div className="space-y-12">
                <div className="flex items-center justify-between">
                   <h2 className="text-3xl font-bold text-slate-900 italic serif">Inter-Departmental Referrals</h2>
                   <span className="px-4 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest">{referrals.length} New Referrals</span>
                </div>
                <div className="grid grid-cols-1 gap-6">
                   {referrals.map((ref, idx) => (
                      <motion.div 
                        key={ref.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-soft flex flex-col md:flex-row justify-between items-center gap-8 group hover:border-blue-200 transition-all"
                      >
                         <div className="flex items-center gap-6">
                            <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 font-bold">
                               {ref.patientName?.charAt(0)}
                            </div>
                            <div>
                               <h3 className="text-xl font-bold text-slate-900 italic serif">{ref.patientName}</h3>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">From: {ref.sourceDept} • Priority: {ref.priority}</p>
                            </div>
                         </div>
                         <div className="flex-1 max-w-md">
                            <p className="text-sm italic serif text-slate-500 line-clamp-1 group-hover:line-clamp-none transition-all">"{ref.reason}"</p>
                         </div>
                         <button 
                           onClick={() => setShowNewCaseModal(true)}
                           className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-all"
                         >
                            Evaluate & Admit
                         </button>
                      </motion.div>
                   ))}
                   {referrals.length === 0 && (
                      <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                         <ClipboardList className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                         <p className="text-slate-400 italic serif">No pending paediatric referrals found.</p>
                      </div>
                   )}
                </div>
             </div>
          ) : (
            <div className="p-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100">
               <Shell className="h-12 w-12 text-slate-200 mx-auto mb-6 animate-spin-slow" />
               <p className="text-slate-400 italic serif text-lg">Specialized theatre coordination logic initializing...</p>
            </div>
          )}
        </AnimatePresence>
      </main>

      {showNewCaseModal && (
         <NewCaseModal 
           onClose={() => setShowNewCaseModal(false)} 
           refresh={fetchCases}
         />
      )}
    </div>
  );
}

function StatCard({ label, val, icon: Icon, color }: any) {
   const colors: any = {
      blue: "bg-blue-50 text-blue-600 border-blue-100",
      rose: "bg-rose-50 text-rose-600 border-rose-100",
      amber: "bg-amber-50 text-amber-600 border-amber-100",
      indigo: "bg-indigo-50 text-indigo-600 border-indigo-100"
   };
   return (
      <div className={`p-8 rounded-[2.5rem] border-2 ${colors[color]} shadow-soft hover:scale-105 transition-all`}>
         <div className="flex items-center justify-between mb-6">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
               <Icon className="h-5 w-5" />
            </div>
         </div>
         <div className="text-4xl font-bold text-slate-900 mb-2">{val}</div>
         <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">{label}</div>
      </div>
   );
}

function CaseCard({ c, idx, onClick }: { c: PaediatricCase; idx: number; onClick: () => void }) {
   return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05 }}
        onClick={onClick}
        className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-soft hover:shadow-premium hover:border-blue-100 transition-all cursor-pointer group relative overflow-hidden"
      >
         <div className="flex justify-between items-start mb-10">
            <div className="h-16 w-16 bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center font-bold text-2xl group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
               {c.patientName.charAt(0)}
            </div>
            <div className={`px-4 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${c.urgency === 'Emergency' ? 'bg-rose-500 text-white shadow-glow' : 'bg-blue-600 text-white'}`}>
               {c.urgency}
            </div>
         </div>

         <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-1 italic serif">{c.patientName}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">{c.age} • Age • {c.subspecialty}</p>

            <div className="space-y-4">
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Status</div>
                  <div className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{c.status}</div>
               </div>
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[9px] font-bold text-slate-400 uppercase">Lead Surgeon</div>
                  <div className="text-[9px] font-bold text-slate-900 uppercase">{c.assignedSurgeonName}</div>
               </div>
            </div>
         </div>
      </motion.div>
   );
}

function SurgicalCaseView({ caseData, onBack, refresh, setSelectedCase }: any) {
   const [activeSection, setActiveSection] = useState("Workflow");
   const [updating, setUpdating] = useState(false);

   async function updateStatus(newStatus: string) {
      setUpdating(true);
      try {
         await updateDoc(doc(db, "paediatric_surgery_cases", caseData.id), {
            status: newStatus,
            updatedAt: serverTimestamp()
         });
         await refresh();
         setSelectedCase(null);
      } catch (err) {
         console.error(err);
      } finally {
         setUpdating(false);
      }
   }

   return (
      <motion.div 
         initial={{ opacity: 0, x: 20 }}
         animate={{ opacity: 1, x: 0 }}
         className="space-y-12"
      >
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
            <div className="flex items-center gap-6">
               <button onClick={onBack} className="h-16 w-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-soft group">
                  <ChevronLeft className="h-8 w-8 group-hover:-translate-x-1 transition-transform" />
               </button>
               <div>
                  <div className="flex items-center gap-4">
                     <h2 className="text-4xl font-bold text-slate-900 tracking-tight italic serif">{caseData.procedureType}</h2>
                     <span className={`px-4 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${caseData.urgency === 'Emergency' ? 'bg-rose-500 text-white shadow-glow' : 'bg-blue-600 text-white'}`}>{caseData.urgency}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-3">Patient: {caseData.patientName} ({caseData.age}) • Guardian: {caseData.guardianName}</p>
               </div>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-2xl border border-white/5">
                <StatusMarker active={caseData.status === 'Pre-Operative'} label="Pre-Op" color="blue" />
                <StatusMarker active={caseData.status === 'Intra-Operative'} label="Intra-Op" color="emerald" />
                <StatusMarker active={caseData.status === 'Post-Operative'} label="Post-Op" color="indigo" />
            </div>
         </div>

         <div className="grid lg:grid-cols-[1fr_420px] gap-12">
            <div className="space-y-10">
               <div className="flex bg-slate-100 p-2 rounded-[3rem] border border-slate-200 w-fit">
                  {["Workflow", "Clinical Orders", "Critical Monitoring", "Neonatal Metrics"].map(tab => (
                     <button 
                        key={tab}
                        onClick={() => setActiveSection(tab)}
                        className={`px-10 py-4 rounded-[2.5rem] text-[10px] font-bold uppercase tracking-widest transition-all ${activeSection === tab ? "bg-white text-blue-600 shadow-soft" : "text-slate-400 hover:text-slate-600"}`}
                     >
                        {tab}
                     </button>
                  ))}
               </div>

               <div className="bg-white rounded-[4rem] p-12 shadow-premium border border-slate-100">
                  {activeSection === "Clinical Orders" && (
                     <div className="space-y-12">
                        <div className="flex items-center justify-between">
                           <h3 className="text-3xl font-bold text-slate-900 italic serif underline decoration-blue-500/30 underline-offset-8">Surgical Directives</h3>
                           <Database className="h-6 w-6 text-blue-500 opacity-20" />
                        </div>
                        
                        <div className="space-y-12">
                           <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100">
                              <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-6">Diagnostic & Imaging Hub</h4>
                              <InvestigationRequestManager patientId={caseData.patientId} requestedFrom="Paediatric Surgery" />
                           </div>
                           <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100">
                              <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-6">Surgical Pharmacology</h4>
                              <PrescriptionManager patientId={caseData.patientId} requestedFrom="Paediatric Surgery" />
                           </div>
                        </div>
                     </div>
                  )}

                  {activeSection === "Workflow" && (
                     <div className="space-y-12">
                        {caseData.status === "Pre-Operative" && (
                           <div className="space-y-10">
                              <div className="flex items-center justify-between">
                                 <h3 className="text-3xl font-bold text-slate-900 italic serif">Safety Checklist Protocol</h3>
                                 <ShieldCheck className="h-8 w-8 text-emerald-500" />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <SurgicalChecklistItem label="Guardian Consent Verified" checked={true} />
                                 <SurgicalChecklistItem label="Surgical Site Marked (Dr)" checked={true} />
                                 <SurgicalChecklistItem label="Child Fasting Status Confirmed" checked={true} />
                                 <SurgicalChecklistItem label="Anaesthetic Clearance Final" checked={false} />
                              </div>
                              <button 
                                 disabled={updating}
                                 onClick={() => updateStatus("Intra-Operative")} 
                                 className="w-full h-20 bg-emerald-600 text-white rounded-[2rem] font-bold uppercase tracking-widest text-xs shadow-glow flex items-center justify-center gap-4 transition-all hover:scale-[1.01]"
                              >
                                 Commence Intra-Operative Protocol <ChevronRight className="h-5 w-5" />
                              </button>
                           </div>
                        )}

                        {caseData.status === "Intra-Operative" && (
                           <div className="space-y-12">
                              <div className="bg-[#0f172a] rounded-[3rem] p-12 text-white relative overflow-hidden">
                                 <div className="relative z-10">
                                    <div className="flex items-center gap-3 text-blue-400 mb-4">
                                       <Pulse className="h-6 w-6 animate-pulse" />
                                       <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Theatre Telemetry Active</span>
                                    </div>
                                    <h3 className="text-4xl font-bold italic serif mb-4">{caseData.theatreId}</h3>
                                    <p className="text-sm text-white/40 italic serif mb-8">Lead Surgeon: {caseData.assignedSurgeonName}</p>
                                    <div className="flex gap-6">
                                       <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl">
                                          <div className="text-[8px] font-bold text-white/40 uppercase mb-1">Elapsed Time</div>
                                          <div className="text-xl font-bold tabular-nums">01:45:12</div>
                                       </div>
                                       <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl">
                                          <div className="text-[8px] font-bold text-white/40 uppercase mb-1">Temperature</div>
                                          <div className="text-xl font-bold tabular-nums text-blue-400">36.8°C</div>
                                       </div>
                                    </div>
                                 </div>
                              </div>

                              <div className="space-y-6">
                                 <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Surgical Milestones</h4>
                                 <div className="space-y-4">
                                    {["Induction Complete", "Procedural Dissection", "Haemostasis Secured"].map((log, idx) => (
                                       <div key={idx} className="flex gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-soft">
                                          <div className="text-[10px] font-bold text-blue-600 uppercase">Step 0{idx+1}</div>
                                          <div className="text-sm font-medium text-slate-900 italic serif">{log}</div>
                                          <div className="ml-auto flex items-center gap-2 text-[9px] font-bold text-emerald-600 uppercase">Verified <CheckCircle2 className="h-3 w-3" /></div>
                                       </div>
                                    ))}
                                 </div>
                              </div>

                              <button 
                                 disabled={updating}
                                 onClick={() => updateStatus("Post-Operative")} 
                                 className="w-full h-20 bg-blue-600 text-white rounded-[2rem] font-bold uppercase tracking-widest text-xs shadow-premium transition-all hover:bg-blue-700"
                              >
                                 Transition to Recovery Lounge
                              </button>
                           </div>
                        )}

                        {caseData.status === "Post-Operative" && (
                           <div className="space-y-12">
                              <h3 className="text-3xl font-bold text-slate-900 italic serif">Recovery Dashboard</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <RecoveryMetric label="Consciousness" val="Active/Crying" status="good" />
                                 <RecoveryMetric label="Pain Level" val="Managed (VAS 2)" status="stable" />
                                 <RecoveryMetric label="Saturation" val="98% (Room Air)" status="good" />
                                 <RecoveryMetric label="Fluid Output" val="Adequate" status="good" />
                              </div>
                              <button 
                                 disabled={updating}
                                 onClick={() => updateStatus("Completed")} 
                                 className="w-full h-20 bg-slate-900 text-white rounded-[2rem] font-bold uppercase tracking-widest text-xs shadow-premium"
                              >
                                 Finalize Case Discharge
                              </button>
                           </div>
                        )}
                     </div>
                  )}

                  {activeSection === "Neonatal Metrics" && (
                     <div className="space-y-10">
                        <div className="flex items-center justify-between mb-8">
                           <h3 className="text-3xl font-bold text-slate-900 italic serif">Neonatal Physiology</h3>
                           <Baby className="h-8 w-8 text-blue-500" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="p-8 bg-blue-50 rounded-[3rem] border border-blue-100">
                              <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-6 px-2">Biometrics</h4>
                              <div className="space-y-6">
                                 <BiometricItem label="Birth Weight" val={caseData.birthWeight || "3.2 kg"} />
                                 <BiometricItem label="Current Weight" val={caseData.weight} />
                                 <BiometricItem label="APGAR (1/5)" val={caseData.apgarScore || "8, 9"} />
                              </div>
                           </div>
                           <div className="p-8 bg-amber-50 rounded-[3rem] border border-amber-100">
                              <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-6 px-2">Clinical Profile</h4>
                              <div className="space-y-6">
                                 <BiometricItem label="Congenital Anomalies" val={caseData.anomalies || "None Identified"} />
                                 <BiometricItem label="Feeding Strategy" val={caseData.feedingStatus || "NPO / IV Fluids"} />
                                 <BiometricItem label="Nutritional Plan" val="Total Parenteral Nutrition" />
                              </div>
                           </div>
                        </div>
                     </div>
                  )}
               </div>
            </div>

            <aside className="space-y-10">
               <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-premium relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400 opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                  <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.4em] mb-10">Assigned Specialists</h4>
                  <div className="space-y-8">
                     <TeamMember name={caseData.assignedSurgeonName} role="Consultant Surgeon" />
                     <TeamMember name="Dr. Julian Vance" role="Lead Anaesthetist" />
                     <TeamMember name="Nurse Maya Chen" role="Surgical Scrub Specialist" />
                  </div>
               </div>

               <div className="bg-white rounded-[3.5rem] p-10 border border-slate-100 shadow-soft">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Clinical Indicators</h4>
                  <div className="space-y-6">
                     <Indicator icon={Thermometer} label="Body Temp" val="37.1 °C" color="blue" />
                     <Indicator icon={Scale} label="Body Weight" val={caseData.weight} color="emerald" />
                     <Indicator icon={Heart} label="Heart Rate" val="114 bpm" color="rose" />
                  </div>
               </div>
            </aside>
         </div>
      </motion.div>
   );
}

function StatusMarker({ active, label, color }: any) {
   const colors: any = {
      blue: active ? 'bg-blue-600 text-white' : 'text-white/40',
      emerald: active ? 'bg-emerald-600 text-white' : 'text-white/40',
      indigo: active ? 'bg-indigo-600 text-white' : 'text-white/40'
   };
   return (
      <div className={`px-6 py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all ${colors[color]}`}>
         {label}
      </div>
   );
}

function SurgicalChecklistItem({ label, checked }: any) {
   return (
      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
         <div className={`h-6 w-6 rounded-lg flex items-center justify-center border ${checked ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-200"}`}>
            {checked && <CheckCircle2 className="h-4 w-4" />}
         </div>
         <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{label}</span>
      </div>
   );
}

function RecoveryMetric({ label, val, status }: any) {
   return (
      <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
         <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</div>
         <div className="text-xl font-bold italic serif text-slate-900 mb-2">{val}</div>
         <div className={`text-[8px] font-bold uppercase tracking-widest ${status === 'good' ? 'text-emerald-500' : 'text-blue-500'}`}>
            {status}
         </div>
      </div>
   );
}

function BiometricItem({ label, val }: any) {
   return (
      <div className="group">
         <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-blue-500 transition-colors">{label}</div>
         <div className="text-lg font-bold italic serif text-slate-900 group-hover:translate-x-1 transition-transform inline-block">{val}</div>
      </div>
   );
}

function Indicator({ icon: Icon, label, val, color }: any) {
   const colors: any = {
      blue: "text-blue-500 bg-blue-50",
      emerald: "text-emerald-500 bg-emerald-50",
      rose: "text-rose-500 bg-rose-50"
   };
   return (
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
               <Icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{label}</span>
         </div>
         <span className="text-sm font-bold text-slate-900 italic serif">{val}</span>
      </div>
   );
}

function TeamMember({ name, role }: any) {
  return (
    <div className="flex items-center gap-4 group">
       <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center font-bold text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
          <User className="h-6 w-6" />
       </div>
       <div>
          <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">{name}</div>
          <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{role}</div>
       </div>
    </div>
  );
}

function NewCaseModal({ onClose, refresh }: any) {
   const [saving, setSaving] = useState(false);

   async function handleSubmit(e: any) {
      e.preventDefault();
      setSaving(true);
      const formData = new FormData(e.currentTarget);
      
      try {
         await addDoc(collection(db, "paediatric_surgery_cases"), {
            patientId: formData.get("patientId"),
            patientName: formData.get("patientName"),
            guardianName: formData.get("guardianName"),
            age: formData.get("age"),
            weight: formData.get("weight"),
            procedureType: formData.get("procedureType"),
            subspecialty: formData.get("subspecialty"),
            urgency: formData.get("urgency"),
            assignedSurgeonName: formData.get("assignedSurgeonName"),
            theatreId: formData.get("theatreId") || "T-01",
            conditionDetails: formData.get("conditionDetails"),
            status: "Pre-Operative",
            birthWeight: formData.get("birthWeight") || "",
            apgarScore: formData.get("apgarScore") || "",
            anomalies: formData.get("anomalies") || "",
            feedingStatus: formData.get("feedingStatus") || "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
         });
         await refresh();
         onClose();
      } catch (err) {
         console.error(err);
         handleFirestoreError(err, OperationType.WRITE, "paediatric_surgery_cases");
      } finally {
         setSaving(false);
      }
   }

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6">
         <motion.div 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="bg-white rounded-[3.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-12 shadow-2xl relative"
         >
            <div className="flex items-center justify-between mb-12">
               <div>
                  <h2 className="text-4xl font-bold text-slate-900 italic serif">Register Surgical Case</h2>
                  <p className="text-slate-400 text-sm mt-2">Initialize new Paediatric or Neonatal clinical workflow.</p>
               </div>
               <button onClick={onClose} className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all">
                  <Pulse className="h-6 w-6 rotate-45" />
               </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                     <h3 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest px-2">Patient Essentials</h3>
                     <SurgeryInput label="Patient Name" name="patientName" required />
                     <SurgeryInput label="Guardian Name" name="guardianName" required />
                     <div className="grid grid-cols-2 gap-6">
                        <SurgeryInput label="Patient ID / MRN" name="patientId" required />
                        <SurgeryInput label="Age / DOB" name="age" required />
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <SurgeryInput label="Weight (kg)" name="weight" required />
                        <SurgerySelect label="Urgency" name="urgency" options={["Elective", "Emergency", "Neonatal Priority"]} />
                     </div>
                  </div>

                  <div className="space-y-8">
                     <h3 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest px-2">Surgical Definition</h3>
                     <SurgeryInput label="Procedure Type" name="procedureType" required />
                     <SurgerySelect label="Subspecialty" name="subspecialty" options={["General Paediatric", "Neonatal", "Trauma"]} />
                     <div className="grid grid-cols-2 gap-6">
                        <SurgeryInput label="Lead Surgeon" name="assignedSurgeonName" required />
                        <SurgeryInput label="Theatre Assign" name="theatreId" placeholder="T-01" />
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <SurgeryInput label="Birth Weight (Neonatal)" name="birthWeight" />
                        <SurgeryInput label="APGAR Score" name="apgarScore" />
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <SurgeryInput label="Congenital Anomalies" name="anomalies" />
                        <SurgeryInput label="Feeding Strategy" name="feedingStatus" />
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Clinical Indication / Diagnosis</label>
                  <textarea 
                     name="conditionDetails"
                     className="w-full bg-[#F8FAFC] border border-slate-100 rounded-3xl p-6 text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all min-h-[120px]"
                     required
                  />
               </div>

               <button 
                  disabled={saving}
                  className="w-full h-20 bg-slate-900 text-white rounded-[2rem] font-bold uppercase tracking-widest text-xs shadow-premium flex items-center justify-center gap-4 hover:bg-blue-600 transition-all"
               >
                  {saving ? "Deploying Case Logic..." : "Commit Surgical Case to Registry"}
               </button>
            </form>
         </motion.div>
      </div>
   );
}

function SurgeryInput({ label, name, required, placeholder }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      <input 
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full bg-[#F8FAFC] border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all"
      />
    </div>
  );
}

function SurgerySelect({ label, name, options }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      <select 
        name={name}
        className="w-full bg-[#F8FAFC] border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all appearance-none cursor-pointer"
      >
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}
