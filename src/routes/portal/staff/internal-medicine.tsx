import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../portal";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { 
  Stethoscope, Heart, Activity, Pill, Microscope, Search, 
  ChevronRight, AlertCircle, ClipboardList, Database, 
  TrendingUp, Thermometer, Droplets, FlaskConical, 
  Users, Calendar, Scale, Ruler, Wind, Waves, Zap,
  Menu, Info, CheckCircle, ShoppingCart
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";
import { InvestigationRequestManager, PrescriptionManager } from "@/components/ClinicalRequests";
import { VitalTrendsChart } from "@/components/VitalTrendsChart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Route = createFileRoute("/portal/staff/internal-medicine")({
  component: InternalMedicineDashboard,
});

function InternalMedicineDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [activeSubspecialty, setActiveSubspecialty] = useState("General");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const subspecialties = [
    { id: "General", label: "General IM", icon: Stethoscope },
    { id: "Cardiology", label: "Cardiology", icon: Heart },
    { id: "Endocrinology", label: "Endocrinology", icon: Activity },
    { id: "Gastroenterology", label: "Gastroenterology", icon: Waves },
    { id: "Nephrology", label: "Nephrology", icon: Droplets },
    { id: "Pulmonology", label: "Pulmonology", icon: Wind },
    { id: "Rheumatology", label: "Rheumatology", icon: Zap },
    { id: "InfectiousDisease", label: "Infectious Disease", icon: FlaskConical },
  ];

  const [activeChronicCare, setActiveChronicCare] = useState<string | null>(null);
  const [clinicalAlerts, setClinicalAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
        fetchProfile();
        fetchActivePatients();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPatient) {
       detectVitalAlerts(selectedPatient);
    }
  }, [selectedPatient]);

  function detectVitalAlerts(patient: any) {
    const alerts = [];
    // BP logic
    if (patient.bp) {
       const [sys, dia] = patient.bp.split('/').map(Number);
       if (sys > 140 || dia > 90) alerts.push({ type: 'critical', msg: 'Systemic Hypertension (Grade 2)', icon: Activity });
       if (sys < 90) alerts.push({ type: 'urgent', msg: 'Hypotension Detected', icon: AlertCircle });
    }
    // Heart rate logic (assuming pulse in bpm)
    if (patient.pulse && Number(patient.pulse) > 100) alerts.push({ type: 'urgent', msg: 'Sinus Tachycardia', icon: Heart });
    if (patient.pulse && Number(patient.pulse) < 60) alerts.push({ type: 'info', msg: 'Bradycardia Observed', icon: Heart });
    
    // Temp logic
    if (patient.temp && Number(patient.temp) > 37.8) alerts.push({ type: 'urgent', msg: 'Febrile State Detected', icon: Thermometer });

    setClinicalAlerts(alerts);
  }

  async function fetchProfile() {
    try {
      const snap = await getDoc(doc(db, "user_profiles", user!.uid));
      if (snap.exists()) setProfile(snap.data());
    } catch (err) {
      console.error(err);
    }
  }

  async function handleReferral(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPatient) return;
    const formData = new FormData(e.currentTarget);
    const targetDept = formData.get("targetDept") as string;
    const reason = formData.get("reason") as string;

    try {
      await addDoc(collection(db, "alerts"), {
          patientId: selectedPatient.id,
          type: "specialist_referral",
          message: `IM Referral to ${targetDept}: ${reason}`,
          priority: "normal",
          status: "active",
          createdAt: serverTimestamp(),
          targetDept: targetDept.toLowerCase(),
          referredBy: user!.uid
      });
      alert("Referral transmitted successfully.");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "referrals");
    }
  }

  async function fetchActivePatients() {
    setLoading(true);
    try {
      // For demo purposes, we fetch all patients, but in prod we'd filter by department
      const q = query(collection(db, "patients"), limit(10));
      const snap = await getDocs(q);
      setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 flex-col gap-6">
      <div className="h-16 w-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-indigo-400">Loading Medical Node...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight italic serif">Internal Medicine Hub</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Specialist Diagnostic & Treatment Center</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
             <input placeholder="Search medical records..." className="h-11 pl-12 pr-6 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all w-64" />
          </div>
          <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden font-bold text-[10px] text-slate-400 uppercase">
             {profile?.fullName?.charAt(0) || "U"}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Navigation Sidebar */}
        <aside className="w-72 bg-white border-r border-slate-200 h-[calc(100vh-80px)] overflow-y-auto sticky top-20 p-6 space-y-8 no-scrollbar">
           <section>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Clinical Views</h3>
              <div className="space-y-1">
                 {["Dashboard", "Patient List", "Subspecialties", "Chronic Care", "Referrals"].map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-lg font-display' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                       <span className="text-[11px] uppercase tracking-widest">{tab}</span>
                    </button>
                 ))}
              </div>
           </section>

           <section>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Subspecialties</h3>
              <div className="space-y-1">
                 {subspecialties.map(sub => (
                    <button 
                      key={sub.id}
                      onClick={() => {
                        setActiveTab("Subspecialties");
                        setActiveSubspecialty(sub.id);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${activeTab === "Subspecialties" && activeSubspecialty === sub.id ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                       <sub.icon className="h-4 w-4" />
                       <span className="text-[10px] uppercase tracking-widest">{sub.label}</span>
                    </button>
                 ))}
              </div>
           </section>
        </aside>

        <main className="flex-1 p-10 space-y-10">
           {activeTab === "Dashboard" && (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <MetricCard label="Active Consults" val={patients.length} icon={Users} color="text-indigo-600" />
                   <MetricCard label="Urgent Referrals" val="3" icon={AlertCircle} color="text-rose-500" />
                   <MetricCard label="Pending Labs" val="12" icon={Microscope} color="text-amber-500" />
                   <MetricCard label="Bed Occupancy" val="88%" icon={Activity} color="text-emerald-500" />
                </div>

                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-clinical">
                   <h2 className="text-xl font-bold text-slate-900 italic serif mb-8">Internal Medicine Dashboard</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {patients.map(p => (
                         <div key={p.id} onClick={() => { setSelectedPatient(p); setActiveTab("Patient List"); }} className="group cursor-pointer">
                            <div className="p-6 bg-slate-50 rounded-3xl border border-transparent group-hover:border-indigo-200 group-hover:bg-white transition-all">
                               <div className="flex items-center gap-4 mb-4">
                                  <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-indigo-600 border border-slate-100 uppercase">
                                     {p.fullName?.charAt(0) || "P"}
                                  </div>
                                  <div>
                                     <h4 className="text-sm font-bold text-slate-900 truncate">{p.fullName}</h4>
                                     <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{p.gender} • {p.age} yrs</p>
                                  </div>
                               </div>
                               <div className="space-y-2">
                                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                     <div className="h-full bg-indigo-500" style={{ width: '70%' }} />
                                  </div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Diagnostic Progress: 70%</p>
                               </div>
                            </div>
                         </div>
                      ))}
                      {patients.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 italic">No active consults found.</div>}
                   </div>
                </div>
             </motion.div>
           )}

           {activeTab === "Patient List" && (
             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide">
                   {patients.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => setSelectedPatient(p)}
                        className={`flex-shrink-0 px-6 py-3 rounded-2xl border-2 transition-all ${selectedPatient?.id === p.id ? 'bg-indigo-600 text-white border-indigo-400 shadow-glow' : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-100'}`}
                      >
                         <p className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{p.fullName}</p>
                      </button>
                   ))}
                </div>

                {selectedPatient ? (
                   <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
                      <div className="space-y-8">
                         <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-clinical relative overflow-hidden">
                            <div className="flex justify-between items-start mb-10">
                               <div>
                                  <h2 className="text-3xl font-bold text-slate-950 italic serif">{selectedPatient.fullName}</h2>
                                  <div className="flex items-center gap-3 mt-2">
                                     <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">EMR ID: {selectedPatient.id.slice(-8).toUpperCase()}</span>
                                     <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest">NKDA</span>
                                  </div>
                               </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                               <ProfileItem label="Age" val={`${selectedPatient.age} Years`} />
                               <ProfileItem label="Blood Type" val={selectedPatient.bloodGroup || "O+"} />
                               <ProfileItem label="Height" val={`${selectedPatient.height || 175} cm`} />
                               <ProfileItem label="Weight" val={`${selectedPatient.weight || 70} kg`} />
                            </div>

                            {clinicalAlerts.length > 0 && (
                               <motion.div 
                                 initial={{ opacity: 0, y: -20 }} 
                                 animate={{ opacity: 1, y: 0 }} 
                                 className="mb-10 p-8 bg-rose-50 border border-rose-100 rounded-[2.5rem] relative overflow-hidden"
                               >
                                  <div className="absolute top-0 right-0 p-6 opacity-10">
                                     <AlertCircle className="h-16 w-16 text-rose-500" />
                                  </div>
                                  <h4 className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-6 px-2 flex items-center gap-2">
                                     <Activity className="h-4 w-4 animate-pulse" /> Clinical Guard: Vital Alerts
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     {clinicalAlerts.map((alert, i) => (
                                        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-rose-100 shadow-sm">
                                           <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${alert.type === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                              <alert.icon className="h-5 w-5" />
                                           </div>
                                           <span className="text-sm font-bold text-slate-800 italic serif">{alert.msg}</span>
                                        </div>
                                     ))}
                                  </div>
                               </motion.div>
                            )}

                            {activeSubspecialty === "Cardiology" && (
                               <div className="mb-10 p-10 bg-indigo-50/40 border border-indigo-100 rounded-[3rem] relative overflow-hidden backdrop-blur-md">
                                  <div className="absolute -right-12 -top-12 opacity-5">
                                     <Heart className="h-48 w-48 text-indigo-500" />
                                  </div>
                                  <div className="relative z-10">
                                     <div className="flex items-center justify-between mb-8">
                                        <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest px-2">Subspecialty: Cardiovascular Analytics</h4>
                                        <span className="px-3 py-1 bg-white border border-indigo-100 rounded-lg text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Live Stratification</span>
                                     </div>
                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="p-6 bg-white rounded-3xl border border-indigo-50 shadow-sm">
                                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">ASCVD 10-Yr Risk</p>
                                           <div className="flex items-baseline gap-2">
                                              <span className="text-2xl font-black text-rose-500 italic serif">14.2%</span>
                                              <span className="text-[8px] font-bold text-rose-400 uppercase">High Risk</span>
                                           </div>
                                        </div>
                                        <div className="p-6 bg-white rounded-3xl border border-indigo-50 shadow-sm">
                                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ejection Fraction</p>
                                           <span className="text-2xl font-black text-emerald-500 italic serif">58%</span>
                                        </div>
                                        <div className="p-6 bg-white rounded-3xl border border-indigo-50 shadow-sm">
                                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">QTc Interval</p>
                                           <span className="text-2xl font-black text-slate-900 italic serif">422 ms</span>
                                        </div>
                                     </div>
                                  </div>
                               </div>
                            )}

                            {activeSubspecialty === "Endocrinology" && (
                               <div className="mb-10 p-10 bg-emerald-50/40 border border-emerald-100 rounded-[3rem] relative overflow-hidden backdrop-blur-md">
                                  <div className="absolute -right-12 -top-12 opacity-5">
                                     <Activity className="h-48 w-48 text-emerald-500" />
                                  </div>
                                  <div className="relative z-10">
                                     <div className="flex items-center justify-between mb-8">
                                        <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest px-2">Subspecialty: Metabolic Monitoring</h4>
                                        <span className="px-3 py-1 bg-white border border-emerald-100 rounded-lg text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Glycemic Review</span>
                                     </div>
                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="p-6 bg-white rounded-3xl border border-emerald-50 shadow-sm">
                                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Estimated HbA1c</p>
                                           <div className="flex items-baseline gap-2">
                                              <span className="text-2xl font-black text-amber-600 italic serif">7.1%</span>
                                              <span className="text-[8px] font-bold text-amber-400 uppercase">Borderline</span>
                                           </div>
                                        </div>
                                        <div className="p-6 bg-white rounded-3xl border border-emerald-50 shadow-sm">
                                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Estimated AVG Glucose</p>
                                           <span className="text-2xl font-black text-emerald-500 italic serif">156 mg/dL</span>
                                        </div>
                                        <div className="p-6 bg-white rounded-3xl border border-emerald-50 shadow-sm">
                                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Target in Range</p>
                                           <span className="text-2xl font-black text-slate-900 italic serif">72%</span>
                                        </div>
                                     </div>
                                  </div>
                               </div>
                            )}

                            <div className="mb-12">
                               <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Physiological Trends History</h4>
                               <VitalTrendsChart patientId={selectedPatient.id} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                               <div>
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                     <Activity className="h-4 w-4 text-emerald-500" /> Active Problems
                                  </h4>
                                  <ul className="space-y-3">
                                     <li className="flex items-center gap-3 text-sm font-bold text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                        Primary Hypertension (Essential)
                                     </li>
                                     <li className="flex items-center gap-3 text-sm font-bold text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                                        Type 2 Diabetes Mellitus
                                     </li>
                                  </ul>
                               </div>
                               <div>
                                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                     <Pill className="h-4 w-4 text-indigo-500" /> Maintenance Drugs
                                  </h4>
                                  <ul className="space-y-3">
                                     <li className="text-sm font-bold text-slate-700 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                        Amlodipine 5mg OD
                                     </li>
                                     <li className="text-sm font-bold text-slate-700 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50">
                                        Metformin 500mg BD
                                     </li>
                                  </ul>
                               </div>
                            </div>
                         </div>

                         <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-clinical">
                             <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Clinical Orders & Requests</h4>
                             <div className="space-y-12">
                                <section>
                                   <div className="flex items-center gap-3 mb-6">
                                      <Microscope className="h-5 w-5 text-amber-500" />
                                      <h3 className="text-lg font-bold text-slate-900 border-b-2 border-amber-100 pb-1">Diagnostic Investigations</h3>
                                   </div>
                                   <InvestigationRequestManager patientId={selectedPatient.id} requestedFrom={`Internal Medicine: ${activeSubspecialty}`} />
                                </section>

                                <section>
                                   <div className="flex items-center gap-3 mb-6">
                                      <ShoppingCart className="h-5 w-5 text-indigo-500" />
                                      <h3 className="text-lg font-bold text-slate-900 border-b-2 border-indigo-100 pb-1">Pharmacy Prescriptions</h3>
                                   </div>
                                   <PrescriptionManager patientId={selectedPatient.id} requestedFrom={`Internal Medicine: ${activeSubspecialty}`} />
                                </section>
                             </div>
                         </div>
                      </div>

                      <div className="space-y-8">
                         <div className="bg-[#0f172a] rounded-[3rem] p-8 text-white shadow-heavy relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 h-40 w-40 bg-indigo-500/10 rounded-full blur-3xl" />
                            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em] mb-6">Real-time Vitals</h4>
                            <div className="space-y-8">
                               <VitalRow label="Heart Rate" val="72" unit="BPM" status="Stable" color="text-rose-400" />
                               <VitalRow label="SpO2" val="98" unit="%" status="Normal" color="text-emerald-400" />
                               <VitalRow label="BP" val="125/82" unit="mmHg" status="Normal" color="text-blue-400" />
                               <VitalRow label="Temp" val="36.8" unit="°C" status="Normal" color="text-amber-400" />
                            </div>
                         </div>

                         <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-soft">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Medical History Timeline</h4>
                            <div className="space-y-6">
                               <HistoryItem date="May 01, 2026" event="Cardiology Review" author="Dr. Smith" />
                               <HistoryItem date="Apr 28, 2026" event="Endocrine Screening" author="Clinical Lab" />
                               <HistoryItem date="Apr 25, 2026" event="Annual Assessment" author="EMR System" />
                            </div>
                         </div>
                      </div>
                   </div>
                ) : (
                    <div className="h-96 flex items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-slate-400 italic">
                        Select a patient to begin clinical evaluation.
                    </div>
                )}
             </motion.div>
           )}

           {activeTab === "Subspecialties" && (
             <SubspecialtyModule moduleId={activeSubspecialty} />
           )}

           {activeTab === "Chronic Care" && selectedPatient && (
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">
                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-clinical">
                   <h2 className="text-xl font-bold text-slate-900 italic serif mb-8">Chronic Disease Management: {selectedPatient.fullName}</h2>
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-6">
                         <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Disease Tracking Trends</h4>
                         <VitalTrendsChart patientId={selectedPatient.id} />
                         <div className="grid grid-cols-2 gap-4">
                            {["Hypertension", "Diabetes", "CKD Stage II", "COPD"].map(tag => (
                               <div key={tag} className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                  <span className="text-xs font-bold text-indigo-700">{tag}</span>
                                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-glow" />
                               </div>
                            ))}
                         </div>
                      </div>
                      <div className="p-8 bg-[#0f172a] rounded-[2.5rem] text-white space-y-6">
                         <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Long-term Goals</h4>
                         <ul className="space-y-4">
                            <li className="flex items-center gap-3 text-sm font-medium"> <CheckCircle className="h-4 w-4 text-emerald-400" /> Target BP 130/80</li>
                            <li className="flex items-center gap-3 text-sm font-medium"> <CheckCircle className="h-4 w-4 text-emerald-400" /> HbA1c &lt; 7.0%</li>
                            <li className="flex items-center gap-3 text-sm font-medium"> <CheckCircle className="h-4 w-4 text-emerald-400" /> LDL Cholesterol &lt; 70mg/dL</li>
                         </ul>
                         <button className="w-full h-12 bg-indigo-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all">Update Care Plan</button>
                      </div>
                   </div>
                </div>
             </motion.div>
           )}

           {activeTab === "Referrals" && selectedPatient && (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-clinical max-w-2xl mx-auto">
                   <div className="flex items-center gap-4 mb-8">
                      <div className="h-12 w-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                         <Users className="h-6 w-6" />
                      </div>
                      <div>
                         <h2 className="text-xl font-bold text-slate-900 italic serif">Specialist Referral Node</h2>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Inter-departmental Consultation Request</p>
                      </div>
                   </div>

                   <form onSubmit={handleReferral} className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Target Department</label>
                         <select name="targetDept" required className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-sm font-bold text-slate-900 outline-none">
                            <option value="Surgery">General Surgery</option>
                            <option value="Paediatrics">Paediatrics</option>
                            <option value="Obstetrics">Obstetrics & Gynaecology</option>
                            <option value="Orthopaedics">Orthopaedics</option>
                            <option value="ENT">ENT Surgery</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Reason for Referral / Urgent Concerns</label>
                         <textarea name="reason" required className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 text-sm font-medium outline-none h-40" placeholder="Please provide clinical summary and specific question for the consultant..." />
                      </div>
                      <button className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-indigo-700 shadow-premium transition-all">Submit Referral Order</button>
                   </form>
                </div>
             </motion.div>
           )}
        </main>
      </div>
    </div>
  );
}

function MetricCard({ label, val, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-clinical flex items-center gap-6 group hover:-translate-y-1 transition-all">
       <div className={`h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center ${color}`}>
          <Icon className="h-7 w-7" />
       </div>
       <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mb-2">{label}</p>
          <h3 className="text-2xl font-black text-slate-900 leading-none">{val}</h3>
       </div>
    </div>
  );
}

function ProfileItem({ label, val }: any) {
  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
       <p className="text-sm font-bold text-slate-900 italic serif">{val}</p>
    </div>
  );
}

function VitalRow({ label, val, unit, status, color }: any) {
  return (
    <div className="flex items-center justify-between group">
       <div>
          <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
             <span className={`text-2xl font-black ${color}`}>{val}</span>
             <span className="text-[9px] font-bold text-slate-500 uppercase">{unit}</span>
          </div>
       </div>
       <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-[8px] font-bold uppercase tracking-widest text-slate-400">
          {status}
       </div>
    </div>
  );
}

function HistoryItem({ date, event, author }: any) {
  return (
    <div className="flex gap-4 group">
       <div className="mt-1.5 h-2 w-2 rounded-full bg-indigo-200 ring-4 ring-indigo-50 flex-shrink-0" />
       <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{date}</p>
          <h5 className="text-sm font-bold text-slate-800">{event}</h5>
          <p className="text-[10px] font-bold text-indigo-50 uppercase tracking-[0.2em] mt-1">{author}</p>
       </div>
    </div>
  );
}

function SubspecialtyModule({ moduleId }: { moduleId: string }) {
  const modules: any = {
    General: {
        description: "Comprehensive adult medical evaluation and chronic disease coordination.",
        metrics: [
            { label: "BMI", val: "24.2", unit: "kg/m²" },
            { label: "Stability Index", val: "High", unit: "Clinical" }
        ],
        fields: ["Clinical Impression", "Differentials", "Systemic Review"]
    },
    Cardiology: {
      metrics: [
        { label: "Mean arterial pressure", val: "94", unit: "mmHg" },
        { label: "ECG Status", val: "Sinus", unit: "Rate 72" },
      ],
      fields: ["ECG Interpretation", "HTN Classification", "Cardiac Risk Score"],
      description: "Advanced hypertension management and heart disease tracking."
    },
    Endocrinology: {
      metrics: [
        { label: "Blood Glucose", val: "142", unit: "mg/dL" },
        { label: "HbA1c", val: "7.2", unit: "%" },
      ],
      fields: ["Glycemic Control Plan", "Hormonal Assessment", "Insulin Titration"],
      description: "Management of diabetes, thyroid, and metabolic syndromes."
    },
    Gastroenterology: {
      metrics: [
        { label: "Liver Enzymes", val: "WNL", unit: "Ref" },
        { label: "Bilirubin", val: "0.8", unit: "mg/dL" },
      ],
      fields: ["GI Symptom Cluster", "Liver Function Analysis", "Endoscopy Correlation"],
      description: "Evaluation of the digestive system and hepatobiliary health."
    },
    Nephrology: {
       metrics: [
         { label: "Creatinine", val: "1.1", unit: "mg/dL" },
         { label: "eGFR", val: "94", unit: "mL/min" },
       ],
       fields: ["Renal Clearance", "Electrolyte Analysis", "Fluid Requirements"],
       description: "Renal monitoring, chronic kidney disease staging, and electrolyte management."
    },
    Pulmonology: {
      metrics: [
        { label: "Oxygen Saturation", val: "98", unit: "%" },
        { label: "Peak Flow", val: "450", unit: "L/min" },
      ],
      fields: ["Respiratory Failure Staging", "Spirometry Analysis", "Nebulization Protocol"],
      description: "Management of asthma, COPD, and restrictive lung diseases."
    },
    Rheumatology: {
      metrics: [
        { label: "ESR", val: "12", unit: "mm/hr" },
        { label: "CRP", val: "2.4", unit: "mg/L" },
      ],
      fields: ["Joint Assessment Chart", "Autoimmune Biomarkers", "Biologic Therapy Tracking"],
      description: "Complex autoimmune and inflammatory joint disorder management."
    },
    InfectiousDisease: {
       metrics: [
         { label: "WBC count", val: "8.4", unit: "x10^9/L" },
         { label: "Procalcitonin", val: "0.05", unit: "ng/mL" },
       ],
       fields: ["Infection Source Identification", "Culture & Sensitivity Correlation", "Antibiotic Stewardship Protocol"],
       description: "Infection control, multidrug-resistant organism monitoring, and specialized fever evaluation."
    }
  };

  const config = modules[moduleId] || { description: "Specialized clinical module under final validation.", metrics: [], fields: [] };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-10">
       <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-premium relative overflow-hidden">
          <div className="flex items-center gap-6 mb-10">
             <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-3xl italic serif font-bold shadow-soft">
                {moduleId.charAt(0)}
             </div>
             <div>
                <h2 className="text-3xl font-bold text-slate-950 italic serif">{moduleId} Medicine</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 tracking-[0.4em]">{config.description}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="space-y-6">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Diagnostic Parameters</h4>
                {config.metrics.map((m: any, i: number) => (
                   <div key={i} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-indigo-200 transition-all">
                      <span className="text-sm font-bold text-slate-600">{m.label}</span>
                      <div className="flex items-baseline gap-2">
                         <span className="text-xl font-black text-slate-900 font-display">{m.val}</span>
                         <span className="text-[9px] font-bold text-slate-400 uppercase">{m.unit}</span>
                      </div>
                   </div>
                ))}
                {config.metrics.length === 0 && <p className="italic text-slate-400 text-sm p-10 text-center bg-slate-50 rounded-[2rem]">Specialist clinical nodes initializing...</p>}
             </div>

             <div className="space-y-8">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Specialist Examination</h4>
                <div className="space-y-6">
                   {config.fields.map((f: string, i: number) => (
                      <div key={i} className="space-y-2">
                         <label className="text-[9px] font-black text-indigo-600 uppercase tracking-widest ml-4">{f}</label>
                         <textarea className="w-full bg-white border border-slate-200 rounded-3xl p-6 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all h-28 shadow-soft" placeholder="Enter specialist observations..." />
                      </div>
                   ))}
                   <button className="w-full h-16 bg-[#0f172a] text-white rounded-[2rem] font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-emerald-600 transition-all shadow-premium flex items-center justify-center gap-3">
                      <CheckCircle className="h-4 w-4" /> Commit Module Record
                   </button>
                </div>
             </div>
          </div>
       </div>
    </motion.div>
  );
}
