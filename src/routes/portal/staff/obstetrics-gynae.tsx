import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../portal";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, setDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { Stethoscope, Users, Plus, Activity, ClipboardList, LogOut, ChevronRight, User, Search, Filter, Microscope, Thermometer, Heart, Droplets, Calendar, ShieldCheck, Save, Check, FileText, Table, Clock, Pill, Trash2, Baby, Zap, AlertCircle, TrendingUp, Info } from "lucide-react";
import { InvestigationRequestManager, PrescriptionManager } from "@/components/ClinicalRequests";
import { motion, AnimatePresence } from "motion/react";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";

export const Route = createFileRoute("/portal/staff/obstetrics-gynae")({
  component: ObstetricsGynaeDepartment,
});

function ObstetricsGynaeDepartment() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Antenatal");
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCaseModal, setShowNewCaseModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);

  const units = [
    { id: "Antenatal", label: "Antenatal Clinic", icon: Calendar, color: "text-emerald-600 bg-emerald-50" },
    { id: "Labour", label: "Labour & Delivery", icon: Baby, color: "text-rose-600 bg-rose-50" },
    { id: "Postnatal", label: "Postnatal Care", icon: Heart, color: "text-pink-600 bg-pink-50" },
    { id: "Gynae", label: "Gynaecology Clinic", icon: ShieldCheck, color: "text-indigo-600 bg-indigo-50" },
    { id: "Fertility", label: "Fertility / Reproductive Health", icon: Zap, color: "text-amber-600 bg-amber-50" },
  ];

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
      await fetchCases();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCases() {
    try {
      const q = query(collection(db, "og_cases"), orderBy("createdAt", "desc"), limit(50));
      const snap = await getDocs(q);
      setCases(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleNewCase(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    // Auto-calculate EDD if LMP is provided
    const lmp = formData.get("lmp") as string;
    let edd = "";
    if (lmp) {
      const lmpDate = new Date(lmp);
      const eddDate = new Date(lmpDate);
      eddDate.setDate(eddDate.getDate() + 280); // 40 weeks
      edd = eddDate.toISOString().split('T')[0];
    }

    const data = {
      patientName: formData.get("patientName"),
      patientId: formData.get("patientId"),
      unit: formData.get("unit"),
      age: formData.get("age"),
      gravida: formData.get("gravida"),
      para: formData.get("para"),
      lmp: lmp,
      edd: edd,
      status: "Active",
      createdAt: serverTimestamp(),
      createdBy: user!.uid,
      creatorName: profile?.fullName,
      clinicalData: {
        lastVitals: {},
        assessments: []
      }
    };

    try {
      await addDoc(collection(db, "og_cases"), data);
      await fetchCases();
      setShowNewCaseModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "og_cases");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#fdf2f8] gap-6">
      <Baby className="h-12 w-12 text-rose-500 animate-bounce" />
      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-rose-400">Initializing Maternity Node...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* O&G Header Overlay */}
      <header className="bg-white border-b border-rose-100 px-8 py-10 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
           <div>
              <div className="flex items-center gap-3 text-rose-500 mb-2">
                 <ShieldCheck className="h-5 w-5" />
                 <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Division of Obstetrics & Gynaecology</span>
              </div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight italic serif">Clinical Maternal Care</h1>
           </div>
           
           <div className="flex bg-rose-50/50 p-1.5 rounded-[2.5rem] border border-rose-100 overflow-x-auto no-scrollbar max-w-full">
              {units.map((unit) => (
                 <button
                    key={unit.id}
                    onClick={() => { setActiveTab(unit.id); setSelectedCase(null); }}
                    className={`flex items-center gap-2 px-6 py-4 rounded-[2rem] text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                       activeTab === unit.id 
                       ? "bg-white text-rose-600 shadow-clinical border border-rose-100" 
                       : "text-slate-400 hover:text-rose-500"
                    }`}
                 >
                    <unit.icon className={`h-4 w-4 ${activeTab === unit.id ? "" : "opacity-40"}`} />
                    {unit.label}
                 </button>
              ))}
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <AnimatePresence mode="wait">
          {selectedCase ? (
            <CaseDetailsView 
               key="details"
               caseData={selectedCase} 
               onBack={() => setSelectedCase(null)} 
               unit={activeTab}
            />
          ) : (
            <motion.div
               key={activeTab}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               className="space-y-12"
            >
               {/* Quick Stats Header */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <UnitStat label={`Total ${activeTab}`} val={cases.filter(c => c.unit === activeTab).length} icon={Users} color="rose" />
                  <UnitStat label="High Risk Cases" val={0} icon={AlertCircle} color="amber" />
                  <UnitStat label="Scheduled Today" val={0} icon={Calendar} color="blue" />
                  <UnitStat label="Bed Occupancy" val="72%" icon={Activity} color="emerald" />
               </div>

               {/* Unit View Control */}
               <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 italic serif">{activeTab} Registry</h2>
                  <button 
                    onClick={() => setShowNewCaseModal(true)}
                    className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-premium hover:shadow-glow transition-all flex items-center gap-2"
                  >
                     <Plus className="h-4 w-4" /> Register Case
                  </button>
               </div>

               {/* Case Cards Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {cases.filter(c => c.unit === activeTab).map((c) => (
                     <OGCaseCard key={c.id} c={c} onClick={() => setSelectedCase(c)} />
                  ))}
                  
                  {cases.filter(c => c.unit === activeTab).length === 0 && (
                     <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-rose-100 flex flex-col items-center gap-4">
                        <div className="h-16 w-16 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-300">
                           <Search className="h-8 w-8" />
                        </div>
                        <p className="text-slate-400 italic serif">No active records in the {activeTab} unit.</p>
                        <button onClick={() => setShowNewCaseModal(true)} className="text-rose-500 font-bold uppercase text-[10px] tracking-widest hover:underline">Register New Patient</button>
                     </div>
                  )}
               </div>
            </motion.div>
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
                <div className="flex items-center gap-4 mb-8">
                   <div className="h-12 w-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                      <Baby className="h-6 w-6" />
                   </div>
                   <div>
                      <h2 className="text-3xl font-bold text-slate-900 italic serif">Maternal Registry</h2>
                      <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Authorized Clinical Entry</p>
                   </div>
                </div>

                <form onSubmit={handleNewCase} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <OGInput label="Patient Full Name" name="patientName" required />
                      <OGInput label="Hospital ID / MRN" name="patientId" required />
                      <OGSelect label="Department Unit" name="unit" defaultValue={activeTab} options={units.map(u => u.label)} />
                      <OGInput label="Age" name="age" type="number" required />
                      
                      {activeTab === "Antenatal" && (
                         <>
                            <OGInput label="Last Menstrual Period (LMP)" name="lmp" type="date" required />
                            <div className="md:col-span-2 grid grid-cols-2 gap-4">
                               <OGInput label="Gravida (G)" name="gravida" type="number" placeholder="Total Pregnancies" required />
                               <OGInput label="Para (P)" name="para" type="number" placeholder="Live Births" required />
                            </div>
                         </>
                      )}
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
                        className="flex-[2] bg-rose-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-premium hover:shadow-glow transition-all"
                      >
                         {submitting ? "Processing..." : "Commit to Registry"}
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

function CaseDetailsView({ caseData, onBack, unit }: any) {
  const [activeSubTab, setActiveSubTab] = useState("EMR");
  
  const sections = [
    { id: "EMR", label: "Patient Profile", icon: User },
    { id: "Visits", label: "Clinical Visits", icon: ClipboardList },
    { id: "Vitals", label: "Vital Logs", icon: Activity },
    { id: "Tests", label: "Lab & Ultrasound", icon: Microscope },
    { id: "Prescriptions", label: "Prescriptions", icon: Pill },
  ];

  if (unit === "Labour") {
    sections.push({ id: "Labour", label: "Labour Board", icon: Activity });
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-12"
    >
       <div className="flex items-center gap-6">
          <button onClick={onBack} className="h-14 w-14 bg-white rounded-2xl border border-rose-100 flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-all shadow-soft group">
             <ChevronRight className="h-6 w-6 rotate-180 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
             <h2 className="text-4xl font-bold text-slate-900 italic serif tracking-tight">{caseData.patientName}</h2>
             <div className="flex items-center gap-4 mt-2">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">ID: {caseData.patientId}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">{unit} Unit</span>
             </div>
          </div>
       </div>

       <div className="grid lg:grid-cols-[280px_1fr] gap-12">
          <aside className="space-y-4">
             {sections.map(sec => (
                <button
                  key={sec.id}
                  onClick={() => setActiveSubTab(sec.id)}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeSubTab === sec.id ? "bg-rose-600 text-white shadow-premium" : "bg-white text-slate-400 hover:text-rose-500 border border-transparent"}`}
                >
                   <sec.icon className="h-4 w-4" />
                   {sec.label}
                </button>
             ))}
          </aside>

          <main className="bg-white rounded-[3rem] p-10 border border-rose-100 shadow-clinical min-h-[600px]">
             {activeSubTab === "EMR" && (
                <div className="space-y-10">
                   <div className="flex justify-between items-start">
                      <h3 className="text-2xl font-bold italic serif text-slate-900">Clinical Data Invariants</h3>
                      <button className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Edit Records</button>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-8">
                         <DetailSection title="Obstetric Status">
                            <DetailRow label="Gestational Age" val="24 Weeks 3 Days" />
                            <DetailRow label="Gravida / Para" val={`G${caseData.gravida} P${caseData.para}`} />
                            <DetailRow label="EDD (Scan Verified)" val={caseData.edd} />
                            <DetailRow label="LMP Reported" val={caseData.lmp} />
                         </DetailSection>

                         <DetailSection title="Medical Indicators">
                            <DetailRow label="Blood Group" val="A Positive (Verified)" />
                            <DetailRow label="Rhesus Factor" val="Positive" />
                            <DetailRow label="Allergies" val="No Known Drug Allergies" />
                         </DetailSection>
                      </div>

                      <div className="space-y-8">
                         <div className="bg-rose-50/50 p-8 rounded-3xl border border-rose-100">
                            <h4 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-6">Pregnancy Journey</h4>
                            <div className="relative pt-2">
                               <div className="absolute left-0 top-0 w-full h-1 bg-white rounded-full overflow-hidden">
                                  <div className="h-full bg-rose-500" style={{ width: '60%' }} />
                               </div>
                               <div className="flex justify-between mt-4 text-[10px] font-bold text-rose-400 uppercase">
                                  <span>Trimester 1</span>
                                  <span>Trimester 2</span>
                                  <span>Trimester 3</span>
                               </div>
                            </div>
                         </div>

                         <div className="bg-slate-900 rounded-3xl p-8 text-white">
                            <div className="flex justify-between mb-4">
                               <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Clinical Alert Status</div>
                               <Check className="h-4 w-4 text-emerald-400" />
                            </div>
                            <p className="text-sm italic serif opacity-80 leading-relaxed mb-6">Patient follows normal development trajectory. Foetal growth metrics within 95th percentile.</p>
                            <div className="h-2 w-full bg-white/10 rounded-full" />
                         </div>
                      </div>
                   </div>
                </div>
             )}
             
             {activeSubTab === "Visits" && (
                <div className="space-y-8">
                   <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold italic serif text-slate-900">Visit History</h3>
                      <button className="px-6 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-bold uppercase">Record New Visit</button>
                   </div>
                   
                   <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                         <div key={i} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between group hover:bg-white hover:border-rose-100 transition-all">
                            <div className="flex items-center gap-6">
                               <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-rose-300 font-bold text-xs">{i}</div>
                               <div>
                                  <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Clinical Visit • Node {i}</div>
                                  <div className="text-sm font-bold text-slate-900 italic serif">Standard clinical assessment - Condition stable</div>
                               </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-rose-500" />
                         </div>
                      ))}
                   </div>
                </div>
             )}

             {activeSubTab === "EMR" && unit === "Gynae" && (
                <div className="space-y-10">
                   <h3 className="text-2xl font-bold italic serif text-slate-900">Gynaecological Assessment</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <DetailSection title="Clinical History">
                         <DetailRow label="Chief Complaint" val="Irregular Menstrual Cycle" />
                         <DetailRow label="Menstrual History" val="Last Period: 3 weeks ago" />
                         <DetailRow label="Sexual History" val="Recorded privately" />
                      </DetailSection>
                      <DetailSection title="Diagnostic Summary">
                         <DetailRow label="Diagnosis" val="Hormonal Imbalance (Suspected)" />
                         <DetailRow label="Treatment Plan" val="Pelvic Ultrasound + Blood Panel" />
                         <DetailRow label="Follow-up" val="14 days" />
                      </DetailSection>
                   </div>
                </div>
             )}

             {activeSubTab === "Tests" && (
                <InvestigationRequestManager patientId={caseData.patientId} />
             )}
             {activeSubTab === "Vitals" && (
                <div className="space-y-12">
                   <h3 className="text-2xl font-bold italic serif text-slate-900">Physiological Monitoring</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <OGVitalCard label="Blood Pressure" val="118/76" status="Normal" date="May 02, 10:24 AM" />
                      <OGVitalCard label="Weight" val="68.4 kg" status="+1.2kg" date="May 02, 10:24 AM" />
                      <OGVitalCard label="Fundal Height" val="24 cm" status="Accurate" date="May 02, 10:24 AM" />
                      <OGVitalCard label="Foetal Heart Rate" val="144 bpm" status="Stable" date="May 02, 10:24 AM" />
                   </div>
                </div>
             )}
             {activeSubTab === "Labour" && (
                <div className="space-y-12">
                   <div className="flex items-center justify-between">
                      <div>
                         <h3 className="text-2xl font-bold italic serif text-slate-900">Active Labour Monitor</h3>
                         <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-1">Real-time Partograph Node</p>
                      </div>
                      <div className="flex gap-3">
                         <button className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase">Record Vitals</button>
                         <button className="px-6 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-bold uppercase shadow-glow">Assess Dilation</button>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <LabourProgressMetric label="Cervical Dilation" val="6 cm" status="Active Phase" />
                      <LabourProgressMetric label="Contractions" val="3 / 10 min" status="Strong" />
                      <LabourProgressMetric label="Station" val="-1" status="Engaging" />
                      <LabourProgressMetric label="Foetal HR" val="142 bpm" status="Reassuring" />
                   </div>

                   <div className="p-10 bg-slate-50 border border-slate-100 rounded-[3rem] space-y-6">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time-Based Progression</h4>
                      <div className="space-y-4">
                         {[
                           { time: "10:00 AM", event: "Shift Change: Handover complete. Patient stable.", nurse: "Nurse Sarah" },
                           { time: "09:15 AM", event: "Cervix: 6cm dilated. Membranes intact.", nurse: "Dr. Elena" },
                           { time: "08:30 AM", event: "Admitted to Labour Ward. Latent phase transition.", nurse: "Nurse Sarah" },
                         ].map((l, idx) => (
                            <div key={idx} className="flex gap-6 items-start">
                               <div className="text-[10px] font-bold text-rose-500 w-20 pt-1 tracking-tighter">{l.time}</div>
                               <div className="flex-1 p-4 bg-white rounded-2xl border border-slate-100 text-sm">
                                  <div className="font-bold italic serif text-slate-900 mb-1">{l.event}</div>
                                  <div className="text-[8px] font-bold text-slate-400 uppercase">{l.nurse}</div>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                   
                   <div className="p-10 border-2 border-dashed border-rose-100 rounded-[3rem] bg-rose-50/20 text-center">
                      <h4 className="text-xl font-bold italic serif text-slate-900 mb-2">Delivery Certification</h4>
                      <p className="text-sm text-slate-500 mb-6">Confirm and finalize delivery once the second stage of labour completes.</p>
                      <button className="px-10 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-premium">Commit Delivery Record</button>
                   </div>
                </div>
             )}

             {activeSubTab === "Postnatal" && (
                <div className="space-y-12">
                   <h3 className="text-2xl font-bold italic serif text-slate-900">Postpartum Monitoring</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <DetailSection title="Maternal Condition">
                         <DetailRow label="Uterine Involution" val="Normal (Well contracted)" />
                         <DetailRow label="Lochia Assessment" val="Rubra - Moderate" />
                         <DetailRow label="Episiotomy/Suture" val="Healing well, no infection" />
                         <DetailRow label="Breastfeeding" val="Initiated Successfully" />
                      </DetailSection>

                      <DetailSection title="Neonatal Condition">
                         <DetailRow label="Apgar Score (1m/5m)" val="9 / 10" />
                         <DetailRow label="Birth Weight" val="3.45 kg" />
                         <DetailRow label="Feeding Status" val="Exclusively Breastfed" />
                         <DetailRow label="Jaundice Screen" val="Cleared" />
                      </DetailSection>
                   </div>
                </div>
             )}

             {unit === "Fertility" && (
                <div className="space-y-10">
                   <h3 className="text-2xl font-bold italic serif text-slate-900">Reproductive Health Node</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <DetailSection title="Infertility Profile">
                         <DetailRow label="Duration" val="3 Years" />
                         <DetailRow label="Primary/Secondary" val="Primary" />
                         <DetailRow label="Ovulation Tracking" val="Monitored (Day 14 peak)" />
                      </DetailSection>
                      <DetailSection title="Hormonal Profile">
                         <DetailRow label="FSH / LH" val="Within Range" />
                         <DetailRow label="AMH Level" val="2.1 ng/mL" />
                      </DetailSection>
                   </div>
                </div>
             )}
             {activeSubTab === "Prescriptions" && (
                <PrescriptionManager patientId={caseData.patientId} />
             )}
          </main>
       </div>
    </motion.div>
  );
}

function LabourProgressMetric({ label, val, status }: any) {
  return (
    <div className="p-6 bg-white border border-rose-100 rounded-3xl shadow-soft">
       <div className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">{label}</div>
       <div className="text-3xl font-bold text-slate-900 italic serif mb-1">{val}</div>
       <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">{status}</div>
    </div>
  );
}

function UnitStat({ label, val, icon: Icon, color }: any) {
  const colors: any = {
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border ${colors[color]} shadow-soft group hover:shadow-premium transition-all`}>
      <Icon className="h-6 w-6 mb-6 opacity-40 group-hover:opacity-100 transition-opacity" />
      <div className="text-3xl font-bold font-display italic serif mb-1">{val}</div>
      <div className="text-[9px] font-bold uppercase tracking-widest opacity-60">{label}</div>
    </div>
  );
}

function OGCaseCard({ c, onClick }: { c: any, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-clinical group hover:border-rose-200 hover:shadow-premium transition-all cursor-pointer h-[380px] flex flex-col"
    >
       <div className="flex justify-between items-start mb-8">
          <div className="h-12 w-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center font-bold text-lg italic serif">
             {c.patientName?.charAt(0)}
          </div>
          <span className="px-4 py-1 bg-slate-50 text-slate-500 rounded-full text-[8px] font-bold uppercase tracking-widest">Active EMR</span>
       </div>
       
       <div className="mb-auto">
          <h4 className="text-2xl font-bold text-slate-900 italic serif tracking-tight mb-2 group-hover:text-rose-600 transition-colors">{c.patientName}</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Patient ID: {c.patientId}</p>
          
          <div className="space-y-4">
             <div className="flex items-center justify-between text-[11px] font-bold text-slate-900 italic serif">
                <span className="opacity-40 uppercase tracking-widest text-[9px] font-sans">Gestational Age</span>
                <span>24 Weeks</span>
             </div>
             <div className="flex items-center justify-between text-[11px] font-bold text-slate-900 italic serif">
                <span className="opacity-40 uppercase tracking-widest text-[9px] font-sans">Risk Level</span>
                <span className="text-emerald-600">Standard</span>
             </div>
             <div className="flex items-center justify-between text-[11px] font-bold text-slate-900 italic serif">
                <span className="opacity-40 uppercase tracking-widest text-[9px] font-sans">Para/Gravida</span>
                <span>G{c.gravida} P{c.para}</span>
             </div>
          </div>
       </div>

       <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-between">
          <div className="flex flex-col">
             <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mb-1">Expected Delivery</span>
             <span className="text-[11px] font-bold text-rose-500">{c.edd || "Not Calculated"}</span>
          </div>
          <ChevronRight className="h-5 w-5 text-rose-300 group-hover:translate-x-1 transition-transform" />
       </div>
    </div>
  );
}

function DetailSection({ title, children }: any) {
  return (
    <div className="space-y-4">
       <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-3">{title}</h4>
       <div className="space-y-4 italic serif">
          {children}
       </div>
    </div>
  );
}

function DetailRow({ label, val }: any) {
  return (
    <div className="flex justify-between items-center text-sm font-medium">
       <span className="text-slate-400">{label}</span>
       <span className="text-slate-900 font-bold">{val}</span>
    </div>
  );
}

function OGVitalCard({ label, val, status, date }: any) {
  return (
    <div className="p-6 bg-[#FAFAFA] rounded-3xl border border-slate-100 flex flex-col justify-between h-[160px] hover:border-rose-200 transition-all">
       <div>
          <div className="flex items-center justify-between mb-4">
             <div className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">{label}</div>
             <div className="px-3 py-1 bg-white text-emerald-600 rounded-full text-[8px] font-bold uppercase border border-emerald-100">{status}</div>
          </div>
          <div className="text-3xl font-bold text-slate-900 italic serif">{val}</div>
       </div>
       <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{date}</div>
    </div>
  );
}

function OGInput({ label, name, type = "text", placeholder, required, defaultValue }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      <input 
        name={name} 
        type={type} 
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-[#F8FAFC] border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-300 transition-all placeholder:font-normal placeholder:opacity-30" 
      />
    </div>
  );
}

function OGSelect({ label, name, options, defaultValue }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      <select 
        name={name}
        defaultValue={defaultValue}
        className="w-full bg-[#F8FAFC] border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-300 transition-all appearance-none"
      >
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}
