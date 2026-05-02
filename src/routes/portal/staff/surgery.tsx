import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../portal";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { 
  Stethoscope, Activity, Users, Thermometer, Droplets, Pill, 
  Microscope, ClipboardList, AlertCircle, ChevronRight, Search, 
  FileText, Plus, Calendar, Clock, Scissors, ShieldCheck, Heart, 
  Zap, CheckCircle2, User, ChevronLeft, Link as LinkIcon, Database 
} from "lucide-react";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";
import { motion, AnimatePresence } from "motion/react";
import { InvestigationRequestManager, PrescriptionManager } from "@/components/ClinicalRequests";

export const Route = createFileRoute("/portal/staff/surgery")({
  component: SurgeryDepartmentPage,
});

const subspecialties = [
  "General Surgery", 
  "Orthopaedic Surgery", 
  "Neurosurgery", 
  "Cardiothoracic Surgery", 
  "Plastic & Reconstructive Surgery", 
  "Urology", 
  "Paediatric Surgery"
];

function SurgeryDepartmentPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [activeCases, setActiveCases] = useState<any[]>([]);
  const [theatreSchedule, setTheatreSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [selectedSubspecialty, setSelectedSubspecialty] = useState("General Surgery");
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      if (profSnap.exists()) {
        setProfile(profSnap.data());
      }

      await fetchCases();
      await fetchSchedule();
    } catch (err: any) {
      console.error("Fetch error:", err);
    } finally {
      setTimeout(() => setLoading(false), 800); 
    }
  }

  async function fetchCases() {
     const cSnap = await getDocs(query(collection(db, "surgical_cases"), orderBy("createdAt", "desc"), limit(50)));
     setActiveCases(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function fetchSchedule() {
     const sSnap = await getDocs(query(collection(db, "theatre_schedule"), orderBy("startTime", "asc"), limit(20)));
     setTheatreSchedule(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function handleCreateCase(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setSubmitting(true);
      const formData = new FormData(e.currentTarget);
      const data = {
          patientName: formData.get("patientName"),
          patientId: formData.get("patientId"),
          procedureType: formData.get("procedureType"),
          subspecialty: formData.get("subspecialty"),
          urgency: formData.get("urgency"),
          assignedSurgeonId: user!.uid,
          assignedSurgeonName: profile?.fullName,
          status: "Pre-Operative",
          theatreId: formData.get("theatreId"),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          specialtyDetails: {}, // Placeholder for specialized clinical data
          lifecycle: {
             preOp: { completed: false, checks: [] },
             intraOp: { active: false,StartTime: null, logs: [] },
             postOp: { active: false, recoveryNotes: "" }
          }
      };

      try {
          await addDoc(collection(db, "surgical_cases"), data);
          
          // Emergency Alert
          if (data.urgency === "Emergency") {
             await addDoc(collection(db, "alerts"), {
                type: "SURGICAL_EMERGENCY",
                patientId: data.patientId,
                message: `CRITICAL: Emergency Surgery Required for ${data.patientName}. Procedure: ${data.procedureType}`,
                priority: "high",
                status: "active",
                createdAt: serverTimestamp(),
                targetDept: "surgery"
             });
          }

          await fetchCases();
          setShowNewCaseModal(false);
      } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, "surgical_cases");
      } finally {
          setSubmitting(false);
      }
  }

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0f172a] gap-6 text-white">
      <div className="h-24 w-24 relative">
        <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin" />
        <Scissors className="absolute inset-0 m-auto h-10 w-10 text-blue-500 animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.6em] text-blue-400 mb-2">Hospital Operative Matrix</p>
        <p className="text-xs text-white/40 italic serif">Synchronizing Surgical Specialties...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#0f172a] text-white p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-500/5 -skew-x-12 translate-x-32" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-10 relative z-10">
          <div>
            <div className="flex items-center gap-3 text-blue-400 mb-6">
              <Link to="/portal/staff" className="text-blue-400 hover:text-white transition-colors">
                <ChevronLeft className="h-6 w-6" />
              </Link>
              <Scissors className="h-6 w-6" />
              <span className="text-[11px] font-bold uppercase tracking-[0.4em] font-display">Division of Clinical Surgery</span>
            </div>
            <h1 className="text-6xl font-bold tracking-tight italic serif mb-4">Surgical Command <br /><span className="text-blue-400">Workflow Node</span></h1>
            
            <div className="flex flex-wrap gap-4 mt-8">
               <div className="bg-white/5 border border-white/10 px-8 py-3 rounded-2xl flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                    {activeCases.filter(c => c.urgency === "Emergency" && c.status !== "Completed").length} Emergency Protocols Active
                  </span>
               </div>
               <div className="bg-white/5 border border-white/10 px-8 py-3 rounded-2xl flex items-center gap-4">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                    {activeCases.filter(c => c.status === "Intra-Operative").length} Theatres Occupied
                  </span>
               </div>
            </div>
          </div>

          <div className="flex bg-white/5 p-1.5 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
             {["Dashboard", "Schedule", "Specialties", "Registry"].map(tab => (
                <button 
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSelectedCase(null); }}
                  className={`px-10 py-5 rounded-[2rem] text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? "bg-blue-600 text-white shadow-glow" : "text-white/40 hover:text-white"}`}
                >
                  {tab}
                </button>
             ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-16 -mt-10 relative z-20">
        <AnimatePresence mode="wait">
          {selectedCase ? (
            <SurgicalRecordView 
              key="detail"
              caseData={selectedCase} 
              onBack={() => setSelectedCase(null)} 
              refresh={fetchCases}
              setSelectedCase={setSelectedCase}
            />
          ) : activeTab === "Dashboard" ? (
            <div className="space-y-12">
               {/* Critical Section */}
               {activeCases.some(c => c.urgency === "Emergency" && c.status !== "Completed") && (
                 <section className="bg-rose-50 border-l-8 border-rose-600 rounded-[3rem] p-10 shadow-premium">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-2xl font-bold text-rose-900 italic serif">Critical Surgical Alerts</h3>
                       <AlertCircle className="h-8 w-8 text-rose-600 animate-pulse" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {activeCases.filter(c => c.urgency === "Emergency" && c.status !== "Completed").map(c => (
                         <div key={c.id} onClick={() => setSelectedCase(c)} className="bg-white p-6 rounded-3xl border border-rose-100 shadow-soft cursor-pointer hover:scale-[1.02] transition-all">
                            <div className="flex justify-between mb-4">
                               <span className="text-[9px] font-bold text-rose-600 uppercase tracking-widest">Immediate Referral</span>
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{c.theatreId}</span>
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 italic serif mb-1">{c.procedureType}</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">{c.patientName}</p>
                            <button className="w-full py-3 bg-rose-600 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest">Access Case Node</button>
                         </div>
                       ))}
                    </div>
                 </section>
               )}

               <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
                  <div className="space-y-12">
                     <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-bold text-slate-900 italic serif underline decoration-blue-500 underline-offset-8">Active Operative Flow</h2>
                        <button onClick={() => setShowNewCaseModal(true)} className="px-8 py-4 bg-[#0f172a] text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 hover:bg-blue-600 transition-all shadow-premium">
                           <Plus className="h-4 w-4" /> Initialize Case
                        </button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {activeCases.slice(0, 8).map((c, i) => (
                           <SurgicalCaseCard key={c.id} c={c} delay={i * 0.05} onClick={() => setSelectedCase(c)} />
                        ))}
                     </div>
                  </div>

                  <aside className="space-y-10">
                     <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-soft">
                        <div className="flex items-center justify-between mb-8">
                           <h3 className="text-xl font-bold text-slate-900 italic serif">Theatre Control</h3>
                           <Database className="h-5 w-5 text-blue-500 opacity-20" />
                        </div>
                        <div className="space-y-6">
                           {["Theatre 1", "Theatre 2", "Theatre 3", "Theatre 4", "Theatre 5"].map(t => (
                              <div key={t} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                 <span className="text-xs font-bold text-slate-900 italic serif">{t}</span>
                                 <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${activeCases.some(c => c.theatreId === t && c.status === "Intra-Operative") ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                    {activeCases.some(c => c.theatreId === t && c.status === "Intra-Operative") ? 'Occupied' : 'Sterile/Ready'}
                                 </span>
                              </div>
                           ))}
                        </div>
                     </div>

                     <div className="bg-[#0f172a] rounded-[3rem] p-10 text-white shadow-premium">
                        <h3 className="text-xl font-bold italic serif mb-8">Pending Diagnostics</h3>
                        <div className="space-y-6 opacity-60">
                           <p className="text-[10px] italic serif">Synchronizing Radiology Node...</p>
                        </div>
                     </div>
                  </aside>
               </div>
            </div>
          ) : activeTab === "Specialties" ? (
             <div className="space-y-12">
                <div className="flex flex-wrap gap-4 bg-slate-100 p-2 rounded-[3rem] border border-slate-200">
                   {subspecialties.map(spec => (
                      <button 
                        key={spec}
                        onClick={() => setSelectedSubspecialty(spec)}
                        className={`px-8 py-4 rounded-[2.5rem] text-[10px] font-bold uppercase tracking-widest transition-all ${selectedSubspecialty === spec ? "bg-white text-blue-600 shadow-soft" : "text-slate-400 hover:text-slate-600"}`}
                      >
                         {spec}
                      </button>
                   ))}
                </div>

                <div className="bg-white rounded-[4rem] p-16 shadow-premium border border-slate-100">
                   <div className="flex items-center justify-between mb-12">
                      <div>
                         <h2 className="text-4xl font-bold text-slate-900 italic serif mb-2">{selectedSubspecialty}</h2>
                         <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.4em]">Integrated Clinical Domain</p>
                      </div>
                      <ShieldCheck className="h-10 w-10 text-blue-100" />
                   </div>

                   <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {activeCases.filter(c => c.subspecialty === selectedSubspecialty).length > 0 ? (
                        activeCases.filter(c => c.subspecialty === selectedSubspecialty).map(c => (
                           <SurgicalCaseCard key={c.id} c={c} onClick={() => setSelectedCase(c)} />
                        ))
                      ) : (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
                           <p className="text-slate-400 italic serif">No active surgical pipelines in this specialty domain.</p>
                        </div>
                      )}
                   </section>
                </div>
             </div>
          ) : activeTab === "Schedule" ? (
             <TheatreScheduleView schedule={theatreSchedule} />
          ) : activeTab === "Registry" ? (
             <SurgicalStaffRegistry />
          ) : (
            <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
               <p className="text-slate-400 italic serif">Visualization Pending...</p>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* New Case Modal */}
      <AnimatePresence>
        {showNewCaseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-24">
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               onClick={() => setShowNewCaseModal(false)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
             />
             <motion.div 
               initial={{ opacity: 0, y: 50, scale: 0.9 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: 50, scale: 0.9 }}
               className="relative w-full max-w-2xl bg-white rounded-[3rem] p-12 shadow-2xl overflow-y-auto max-h-[90vh]"
             >
                <h2 className="text-3xl font-bold text-slate-900 italic serif mb-8">Initiate Surgical Pipeline</h2>
                <form onSubmit={handleCreateCase} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <SurgeryInput label="Patient Full Name" name="patientName" required />
                      <SurgeryInput label="Patient ID / MRN" name="patientId" placeholder="PTH-10293" required />
                      <SurgerySelect label="Surgical Specialty" name="subspecialty" options={subspecialties} />
                      <SurgerySelect label="Clinical Urgency" name="urgency" options={["Elective", "Urgent", "Emergency"]} />
                      <div className="md:col-span-2">
                         <SurgeryInput label="Planned Procedure" name="procedureType" placeholder="e.g. Laparoscopic Cholecystectomy" required />
                      </div>
                      <SurgerySelect label="Assigned Theatre" name="theatreId" options={["Theatre 1", "Theatre 2", "Theatre 3", "Theatre 4", "Theatre 5"]} />
                   </div>
                   
                   <div className="pt-8 border-t border-slate-50 flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setShowNewCaseModal(false)}
                        className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600"
                      >
                         Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={submitting}
                        className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-premium hover:shadow-glow transition-all"
                      >
                         {submitting ? "Processing Registry..." : "Authorized: Initialize Workflow"}
                      </button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SurgicalRecordView({ caseData, onBack, refresh, setSelectedCase }: any) {
   const [activeSection, setActiveSection] = useState(caseData.status === "Pre-Operative" ? "Workflow" : (caseData.status === "Intra-Operative" ? "Workflow" : "Workflow"));
   const [updating, setUpdating] = useState(false);

   async function updateStatus(newStatus: string) {
      setUpdating(true);
      try {
         await updateDoc(doc(db, "surgical_cases", caseData.id), {
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
         className="space-y-8"
      >
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
            <div className="flex items-center gap-6">
               <button onClick={onBack} className="h-16 w-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-soft group">
                  <ChevronLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
               </button>
               <div>
                  <div className="flex items-center gap-4">
                     <h2 className="text-4xl font-bold text-slate-900 tracking-tight italic serif">{caseData.procedureType}</h2>
                     <span className={`px-4 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${caseData.urgency === 'Emergency' ? 'bg-rose-600 text-white shadow-glow' : 'bg-blue-600 text-white'}`}>{caseData.urgency}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Specialty: {caseData.subspecialty} • MRN: {caseData.patientId}</p>
               </div>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-2xl border border-white/5">
                <div className={`px-6 py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest ${caseData.status === 'Pre-Operative' ? 'bg-blue-600 text-white' : 'text-white/40'}`}>Pre-Op</div>
                <div className={`px-6 py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest ${caseData.status === 'Intra-Operative' ? 'bg-emerald-600 text-white' : 'text-white/40'}`}>Intra-Op</div>
                <div className={`px-6 py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest ${caseData.status === 'Post-Operative' ? 'bg-indigo-600 text-white' : 'text-white/40'}`}>Post-Op</div>
            </div>
         </div>

         <div className="grid lg:grid-cols-[1fr_420px] gap-12">
            <div className="space-y-10">
               <div className="flex bg-slate-100 p-2 rounded-[3rem] border border-slate-200 w-fit">
                  {["Workflow", "Clinical Orders", "Critical Monitoring", "ICU Transfer"].map(tab => (
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
                           <h3 className="text-3xl font-bold text-slate-900 italic serif">Clinical Directives</h3>
                           <Database className="h-6 w-6 text-blue-500 opacity-20" />
                        </div>
                        
                        <div className="space-y-12">
                           <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100">
                              <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-6">Diagnostic & Imaging Hub</h4>
                              <InvestigationRequestManager patientId={caseData.patientId} />
                           </div>
                           <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100">
                              <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-6">Surgical Pharmacology</h4>
                              <PrescriptionManager patientId={caseData.patientId} />
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
                                 <SurgicalChecklistItem label="Cross-match Confirmed" checked={true} />
                                 <SurgicalChecklistItem label="Site Marked (Lead Surgeon)" checked={true} />
                                 <SurgicalChecklistItem label="WHO Checklist Phase 1 Complete" checked={true} />
                                 <SurgicalChecklistItem label="Anesthesia Induction Clear" checked={false} />
                              </div>
                              <button onClick={() => updateStatus("Intra-Operative")} className="w-full h-20 bg-emerald-600 text-white rounded-[2rem] font-bold uppercase tracking-widest text-xs shadow-glow flex items-center justify-center gap-4 transition-all hover:scale-[1.01]">
                                 Acknowledge & Commence Intra-Operative Protocol <ChevronRight className="h-5 w-5" />
                              </button>
                           </div>
                        )}

                        {caseData.status === "Intra-Operative" && (
                           <div className="space-y-12">
                              <div className="bg-[#0f172a] rounded-[3rem] p-12 text-white relative overflow-hidden">
                                 <div className="relative z-10">
                                    <div className="flex items-center gap-3 text-blue-400 mb-4">
                                       <Activity className="h-6 w-6 animate-pulse" />
                                       <span className="text-[10px] font-bold uppercase tracking-[0.4em]">Theatre Telemetry Active</span>
                                    </div>
                                    <h3 className="text-4xl font-bold italic serif mb-4">{caseData.theatreId}</h3>
                                    <p className="text-sm text-white/40 italic serif mb-8">Lead Surgeon: {caseData.assignedSurgeonName}</p>
                                    <div className="flex gap-6">
                                       <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl">
                                          <div className="text-[8px] font-bold text-white/40 uppercase mb-1">Elapsed Time</div>
                                          <div className="text-xl font-bold tabular-nums">02:14:45</div>
                                       </div>
                                       <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl">
                                          <div className="text-[8px] font-bold text-white/40 uppercase mb-1">Blood Loss (Est)</div>
                                          <div className="text-xl font-bold tabular-nums text-rose-400">150 ml</div>
                                       </div>
                                    </div>
                                 </div>
                                 <Scissors className="absolute -right-10 -bottom-10 h-64 w-64 text-white/5 rotate-12" />
                              </div>

                              <div className="space-y-6">
                                 <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Procedural Milestones</h4>
                                 <div className="space-y-4">
                                    {["Patient Positioned", "Pneumoperitoneum Established", "Primary Dissection Complete"].map((log, idx) => (
                                       <div key={idx} className="flex gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:shadow-soft">
                                          <div className="text-[10px] font-bold text-blue-600 uppercase">Step 0{idx+1}</div>
                                          <div className="text-sm font-medium text-slate-900 italic serif">{log}</div>
                                          <div className="ml-auto flex items-center gap-2 text-[9px] font-bold text-emerald-600 uppercase">Verified <CheckCircle2 className="h-3 w-3" /></div>
                                       </div>
                                    ))}
                                 </div>
                              </div>

                              <button onClick={() => updateStatus("Post-Operative")} className="w-full h-20 bg-blue-600 text-white rounded-[2rem] font-bold uppercase tracking-widest text-xs shadow-premium transition-all hover:bg-blue-700">
                                 Finalize Operative Record & Transition to Recovery
                              </button>
                           </div>
                        )}

                        {(caseData.status === "Post-Operative" || caseData.status === "Completed") && (
                           <div className="space-y-12">
                              <h3 className="text-3xl font-bold text-slate-900 italic serif">Surgical Recovery Analysis</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <RecoveryMetric label="BP Management" val="118/76 mmHg" status="stable" />
                                 <RecoveryMetric label="Pulse Sequence" val="72 BPM" status="good" />
                                 <RecoveryMetric label="O2 Saturation" val="97% RA" status="monitored" />
                                 <RecoveryMetric label="Wound Interface" val="Clean/Dry" status="good" />
                              </div>
                              <div className="space-y-4 bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
                                 <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Post-Op Clinical Notes</h4>
                                 <p className="text-sm italic serif text-slate-600 leading-relaxed italic">
                                    Patient conscious and alert. Pain managed via IV paracetamol. Baseline vitals stable. To be observed for 4 hours prior to ward transfer.
                                 </p>
                              </div>
                           </div>
                        )}
                     </div>
                  )}

                  {activeSection === "Critical Monitoring" && (
                     <div className="space-y-10">
                        <div className="flex items-center justify-between mb-8">
                           <h3 className="text-3xl font-bold text-slate-900 italic serif underline decoration-rose-500 underline-offset-8">Vital Telemetry Streams</h3>
                           <Zap className="h-6 w-6 text-rose-500 animate-pulse" />
                        </div>
                        <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-slate-100 rounded-[3rem]">
                           <p className="text-slate-400 italic serif">Live ICU-link visualization initializing...</p>
                        </div>
                     </div>
                  )}
               </div>
            </div>

            <aside className="space-y-10">
               {/* Specialty Specific Data */}
               <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-premium relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16" />
                  <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.4em] mb-10">Specialized Metrics</h4>
                  
                  {caseData.subspecialty === "Neurosurgery" && (
                     <div className="space-y-8">
                        <ProfileItem label="Current GCS" val="14/15" />
                        <ProfileItem label="Pupillary Response" val="Equal & Reactive" />
                        <ProfileItem label="ICP Level" val="12 mmHg" />
                     </div>
                  )}
                  {caseData.subspecialty === "Cardiothoracic Surgery" && (
                     <div className="space-y-8">
                        <ProfileItem label="LVEF" val="55%" />
                        <ProfileItem label="Cardiac Output" val="4.8 L/min" />
                        <ProfileItem label="Mean Art. Pressure" val="82 mmHg" />
                     </div>
                  )}
                  {caseData.subspecialty === "Urology" && (
                     <div className="space-y-8">
                        <ProfileItem label="Urinary Output" val="50 ml/hr" />
                        <ProfileItem label="Creatinine" val="88 umol/L" />
                        <ProfileItem label="Catheter Node" val="Active/Open" />
                     </div>
                  )}
                  {!["Neurosurgery", "Cardiothoracic Surgery", "Urology"].includes(caseData.subspecialty) && (
                     <div className="space-y-8">
                        <ProfileItem label="Surgical Indication" val="Standard Protocol" />
                        <ProfileItem label="Risk Profile" val="ASA Class II" />
                        <ProfileItem label="Blood Type" val="B Positive" />
                     </div>
                  )}
               </div>

               <div className="bg-white rounded-[3.5rem] p-10 border border-slate-100 shadow-soft">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-10">Assigned Team</h4>
                  <div className="space-y-6">
                     <StaffMember role="Lead Surgeon" name={caseData.assignedSurgeonName} />
                     <StaffMember role="Anesthesiologist" name="Dr. Julian Vane" />
                     <StaffMember role="Floor Nurse" name="Nurse Maya" />
                  </div>
               </div>
            </aside>
         </div>
      </motion.div>
   );
}

function SurgicalChecklistItem({ label, checked }: { label: string; checked: boolean }) {
   return (
      <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${checked ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-white border-slate-100 text-slate-400 opacity-60'}`}>
         <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
         {checked ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <div className="h-4 w-4 rounded-full border-2 border-slate-200" />}
      </div>
   )
}

function TheatreScheduleView({ schedule }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[4rem] p-12 shadow-premium border border-slate-100 relative overflow-hidden"
    >
       <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
       
       <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 relative z-10">
          <div>
             <h2 className="text-4xl font-bold text-slate-900 tracking-tight italic serif mb-2">Utilization Directive</h2>
             <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.4em]">Theatre Occupancy Logistics</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="h-14 w-1px bg-slate-200 hidden md:block" />
             <div className="px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-glow">Live Terminal</div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {["Theatre 1", "Theatre 2", "Theatre 3", "Theatre 4", "Theatre 5"].map((t) => (
             <div key={t} className="bg-slate-50 border border-slate-100 rounded-[3rem] p-8 hover:bg-white hover:shadow-clinical transition-all group">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-lg font-bold text-slate-900 italic serif">{t}</h3>
                   <div className="h-2 w-2 rounded-full bg-emerald-400 group-hover:animate-ping" />
                </div>
                
                <div className="space-y-6">
                   <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Status</span>
                      <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Sterile Mode</span>
                   </div>
                   
                   <div className="p-5 bg-white rounded-2xl border border-slate-100">
                      <div className="text-[8px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-2">Next Scheduled</div>
                      <div className="text-sm font-bold text-slate-900 italic serif">Laparoscopy - 14:00</div>
                   </div>

                   <button className="w-full py-4 rounded-xl border-2 border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:border-blue-600 group-hover:text-blue-600 transition-all">
                      View Logistics
                   </button>
                </div>
             </div>
          ))}
       </div>
    </motion.div>
  );
}

function RecoveryConsole({ cases }: { cases: any[] }) {
   return (
      <motion.div 
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         className="space-y-8"
      >
         <div className="flex justify-between items-end mb-12">
            <div>
               <h2 className="text-4xl font-bold text-slate-900 italic serif mb-2">PACU Control Node</h2>
               <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.4em]">Post-Anesthesia Care Unit</p>
            </div>
            <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 flex items-center gap-3">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">{cases.length} Patients in Recovery</span>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {cases.length > 0 ? cases.map(c => (
               <div key={c.id} className="bg-white rounded-[3rem] p-10 shadow-soft border border-emerald-50">
                  <div className="flex justify-between mb-8">
                     <div>
                        <h4 className="text-xl font-bold text-slate-900 italic serif">{c.patientName}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{c.procedureType}</p>
                     </div>
                     <span className="h-fit px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[8px] font-bold uppercase tracking-widest">{c.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                     <div className="p-4 bg-slate-50 rounded-2xl">
                        <div className="text-[8px] font-bold text-slate-400 uppercase mb-1">SpO2</div>
                        <div className="text-lg font-bold text-slate-900">98%</div>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-2xl">
                        <div className="text-[8px] font-bold text-slate-400 uppercase mb-1">Pulse</div>
                        <div className="text-lg font-bold text-slate-900">72</div>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-2xl">
                        <div className="text-[8px] font-bold text-slate-400 uppercase mb-1">Temp</div>
                        <div className="text-lg font-bold text-slate-900">36.8</div>
                     </div>
                  </div>
                  <button className="w-full py-4 bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-glow">Record Assessment</button>
               </div>
            )) : (
               <div className="col-span-full py-20 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100">
                  <Droplets className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 italic serif">No patients currently in active recovery cycle.</p>
               </div>
            )}
         </div>
      </motion.div>
   );
}

function SurgicalStaffRegistry() {
   const specialists = [
      { name: "Dr. Elena Vance", role: "Chief of Surgery", spec: "Neuro" },
      { name: "Dr. Marcus Thorne", role: "Senior Consultant", spec: "Cardio" },
      { name: "Dr. Sarah Blake", role: "Lead Anesthesiologist", spec: "Critical Care" },
      { name: "Dr. Julian Ross", role: "Surgeon", spec: "Orthopaedic" }
   ];

   return (
      <div className="space-y-12">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {specialists.map(s => (
               <div key={s.name} className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
                  <div className="h-16 w-16 bg-blue-600 rounded-3xl mb-6 flex items-center justify-center font-bold text-2xl italic serif">
                     {s.name.charAt(4)}
                  </div>
                  <h4 className="text-xl font-bold italic serif mb-1">{s.name}</h4>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-6">{s.role}</p>
                  <div className="pt-6 border-t border-white/5">
                     <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">{s.spec} Specialist</span>
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
}

function StaffMember({ role, name }: any) {
  return (
    <div className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group">
       <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">{name?.charAt(0) || "U"}</div>
       <div>
          <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">{role}</div>
          <div className="text-[13px] font-medium text-blue-100 italic serif">{name || "Awaiting Assignment"}</div>
       </div>
    </div>
  );
}

function RecoveryMetric({ label, val, status }: { label: string; val: string; status: "stable" | "good" | "monitored" | "critical" }) {
  const statusColors = {
    stable: "bg-emerald-500",
    good: "bg-blue-500",
    monitored: "bg-amber-500",
    critical: "bg-rose-500"
  };

  return (
    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-blue-200 transition-all">
       <div className="flex justify-between items-start mb-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</div>
          <div className={`h-2 w-2 rounded-full ${statusColors[status]} shadow-glow`} />
       </div>
       <div className="text-xl font-bold text-slate-900 italic serif">{val}</div>
       <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-2">{status}</div>
    </div>
  );
}

function SurgicalCaseCard({ c, delay, onClick }: any) {
   const urgencyColors: any = {
      Emergency: "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]",
      Urgent: "bg-amber-500 text-white",
      Elective: "bg-blue-600 text-white"
   };

   return (
      <motion.div 
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         transition={{ delay }}
         onClick={onClick}
         className="bg-white rounded-[3rem] p-8 shadow-premium border border-slate-100 group hover:shadow-glow transition-all cursor-pointer h-[320px] flex flex-col"
      >
         <div className="flex justify-between items-start mb-6">
            <div className={`px-4 py-1 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] ${urgencyColors[c.urgency] || 'bg-slate-100 text-slate-600'}`}>
               {c.urgency} Action
            </div>
            <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
               <Scissors className="h-5 w-5" />
            </div>
         </div>
         <h4 className="text-2xl font-bold text-slate-900 tracking-tight italic serif mb-1 truncate">{c.procedureType}</h4>
         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">Specialty: {c.subspecialty}</p>
         
         <div className="space-y-4 mb-auto">
            <div className="flex items-center gap-3">
               <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">P</div>
               <div className="text-[11px] font-bold text-slate-900 italic serif">Patient: {c.patientName}</div>
            </div>
            <div className="flex items-center gap-3">
               <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-bold"><Clock className="h-3.5 w-3.5" /></div>
               <div className="text-[11px] font-bold text-slate-900 italic serif uppercase">{c.status}</div>
            </div>
         </div>

         <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-6">
            <div className="text-center w-full">
               <div className="text-[8px] font-bold uppercase tracking-widest opacity-40">Unit</div>
               <div className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">{c.theatreId || "TBD"}</div>
            </div>
         </div>
      </motion.div>
   );
}

function SurgeryInput({ label, name, type = "text", placeholder, required }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      <input 
        name={name} 
        type={type} 
        required={required}
        placeholder={placeholder}
        className="w-full bg-[#F8FAFC] border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all placeholder:font-normal placeholder:opacity-30" 
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
        className="w-full bg-[#F8FAFC] border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 transition-all appearance-none"
      >
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function ProfileItem({ label, val }: { label: string; val: string }) {
   return (
      <div className="group">
         <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-2 group-hover:text-blue-400 transition-colors">{label}</div>
         <div className="text-xl font-bold italic serif text-white group-hover:translate-x-2 transition-transform inline-block">{val}</div>
      </div>
   )
}
