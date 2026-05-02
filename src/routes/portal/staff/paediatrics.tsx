import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../portal";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { Baby, Thermometer, Activity, ShoppingCart, Plus, ChevronLeft, ChevronRight, Search, ClipboardList, AlertCircle, Heart, Star, ToyBrick, Milk, GraduationCap, Scale, Ruler, Microscope, Pill } from "lucide-react";
import { InvestigationRequestManager, PrescriptionManager } from "@/components/ClinicalRequests";
import { motion, AnimatePresence } from "motion/react";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Route = createFileRoute("/portal/staff/paediatrics")({
  component: PaediatricsDepartmentPage,
});

function PaediatricsDepartmentPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Ward");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

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

      const pSnap = await getDocs(query(collection(db, "patients"), limit(20)));
      setPatients(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FFF9F2] gap-6">
      <div className="flex gap-2">
         <motion.div animate={{ rotate: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}><ToyBrick className="h-10 w-10 text-rose-400" /></motion.div>
         <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }}><Heart className="h-10 w-10 text-amber-400" /></motion.div>
         <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 1 }}><Star className="h-10 w-10 text-blue-400" /></motion.div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-rose-500">Warming up the nursery...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFF9F2]">
      <header className="bg-white border-b-4 border-rose-100 p-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          <div>
            <div className="flex items-center gap-3 text-rose-500 mb-6">
              <Link to="/portal/staff" className="text-rose-400 hover:text-rose-600 transition-colors">
                <ChevronLeft className="h-6 w-6" />
              </Link>
              <Baby className="h-6 w-6" />
              <span className="text-[11px] font-bold uppercase tracking-[0.4em]">Paediatrics & Neonatal Care</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-slate-900 mb-4 font-display">Small Heroes <br /><span className="text-rose-500 italic serif">Big Care Node</span></h1>
            <p className="text-slate-400 font-medium">Providing specialized child-focused clinical management.</p>
          </div>
          
          <div className="flex bg-rose-50 p-2 rounded-[2.5rem] border-2 border-rose-100 shadow-inner">
             {["Ward", "Emergency", "Growth", "Immunization"].map(tab => (
                <button 
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSelectedPatient(null); }}
                  className={`px-10 py-5 rounded-[2rem] text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? "bg-white text-rose-600 shadow-premium border border-rose-100" : "text-rose-400 hover:text-rose-600"}`}
                >
                  {tab}
                </button>
             ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <AnimatePresence mode="wait">
          {selectedPatient ? (
             <PaediatricProfile 
               key="profile"
               patient={selectedPatient} 
               onBack={() => setSelectedPatient(null)} 
             />
          ) : activeTab === "Ward" ? (
             <motion.div 
               key="ward"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
             >
                {patients.map((p, i) => (
                   <PaediatricCard key={p.id} p={p} idx={i} onClick={() => setSelectedPatient(p)} />
                ))}
                <button className="h-[280px] bg-white border-4 border-dashed border-rose-50 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-rose-200 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50/20 transition-all group">
                   <Plus className="h-12 w-12 group-hover:scale-125 transition-transform duration-500" />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Register New Tiny Human</span>
                </button>
             </motion.div>
          ) : activeTab === "Growth" ? (
             <GrowthTrackingView />
          ) : (
            <div className="p-32 text-center bg-white rounded-[4rem] border-4 border-dashed border-rose-50">
               <ToyBrick className="h-12 w-12 text-rose-100 mx-auto mb-6" />
               <p className="text-rose-300 italic serif text-lg text-rose-400">Section under specialized calibration...</p>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function PaediatricCard({ p, idx, onClick }: any) {
   return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05 }}
        onClick={onClick}
        className="bg-white rounded-[3.5rem] p-10 border-2 border-rose-50 shadow-soft hover:shadow-glow hover:border-rose-100 transition-all cursor-pointer group relative overflow-hidden"
      >
         <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
         <div className="flex justify-between items-start relative z-10 mb-8">
            <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center font-bold text-2xl shadow-inner group-hover:rotate-12 transition-transform">
               {p.name?.charAt(0)}
            </div>
            <div className="px-5 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[9px] font-bold uppercase tracking-widest border border-amber-100">
               Age: {p.age || "2y 4m"}
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-slate-900 font-display mb-2">{p.name}</h3>
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-8 flex items-center gap-2">
             <AlertCircle className="h-3 w-3" /> Priority: Stable
          </p>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Vital</div>
                <div className="text-sm font-bold text-slate-900 italic serif">36.5°C</div>
             </div>
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Weight</div>
                <div className="text-sm font-bold text-slate-900 italic serif">12.4 kg</div>
             </div>
          </div>
      </motion.div>
   );
}

function PaediatricProfile({ patient, onBack }: any) {
  const [activeSection, setActiveSection] = useState("Vitals");

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-10"
    >
       <div className="flex items-center gap-8">
          <button onClick={onBack} className="h-16 w-16 rounded-[2rem] bg-white border-2 border-rose-100 flex items-center justify-center text-rose-400 hover:text-rose-600 transition-all shadow-premium group">
             <ChevronLeft className="h-8 w-8 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
             <h2 className="text-4xl font-bold text-slate-900 font-display">{patient.name}</h2>
             <div className="flex gap-4 mt-2">
                <span className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">ID: {patient.id}</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">•</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Guardian: {patient.guardianName || "Sarah Jenkins"}</span>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10">
          <div className="space-y-10">
             <div className="flex bg-white p-2 rounded-[2.5rem] border-2 border-rose-50 shadow-soft w-fit">
                {["Vitals", "Growth", "Immunization", "Clinical Notes", "Orders"].map(section => (
                   <button 
                     key={section}
                     onClick={() => setActiveSection(section)}
                     className={`px-10 py-4 rounded-[2rem] text-[10px] font-bold uppercase tracking-widest transition-all ${activeSection === section ? "bg-rose-500 text-white shadow-premium" : "text-slate-400 hover:text-rose-400"}`}
                   >
                      {section}
                   </button>
                ))}
             </div>

             <div className="bg-white rounded-[4rem] p-12 border-2 border-rose-50 shadow-clinical">
                {activeSection === "Orders" && (
                   <div className="space-y-12">
                      <div className="flex items-center justify-between">
                         <h3 className="text-3xl font-bold italic serif text-slate-900">Clinical Orders</h3>
                         <span className="px-4 py-1 bg-rose-50 text-rose-600 rounded-full text-[9px] font-bold uppercase tracking-widest border border-rose-100">Direct Route Active</span>
                      </div>
                      
                      <div className="space-y-12">
                         <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                            <h4 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-6">Laboratory & Imaging</h4>
                            <InvestigationRequestManager patientId={patient.id} />
                         </div>

                         <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                            <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-6">Pharmacy Integration</h4>
                            <PrescriptionManager patientId={patient.id} />
                         </div>
                      </div>
                   </div>
                )}
                {activeSection === "Vitals" && (
                   <div className="space-y-12">
                      <div className="flex items-center justify-between">
                         <h3 className="text-3xl font-bold italic serif text-slate-900">Health Pulse</h3>
                         <Activity className="h-8 w-8 text-rose-500 animate-pulse" />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                         <VitalBox icon={Thermometer} label="Temperature" val="37.2" unit="°C" status="Normal" color="bg-blue-50 text-blue-600" />
                         <VitalBox icon={Heart} label="Heart Rate" val="105" unit="bpm" status="Normal" color="bg-rose-50 text-rose-600" />
                         <VitalBox icon={Activity} label="Resp Rate" val="24" unit="bpm" status="Normal" color="bg-emerald-50 text-emerald-600" />
                         <VitalBox icon={AlertCircle} label="SpO2" val="99" unit="%" status="Normal" color="bg-amber-50 text-amber-600" />
                      </div>

                      <div className="pt-12 border-t-2 border-rose-50">
                         <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Special Observation Case</h4>
                         <p className="text-lg italic serif text-slate-600 leading-relaxed">
                            "Patient is responsive and playing with blocks. Vital signs captured while calm. Last feed was 2 hours ago (150ml). No signs of respiratory distress."
                         </p>
                      </div>
                   </div>
                )}

                {activeSection === "Growth" && (
                   <div className="space-y-12">
                      <div className="flex items-center justify-between">
                         <h3 className="text-3xl font-bold italic serif text-slate-900">Growth Trajectory</h3>
                         <div className="flex gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                               <Scale className="h-4 w-4 text-rose-500" />
                               <span className="text-[10px] font-bold text-slate-900 uppercase">12.4 kg</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                               <Ruler className="h-4 w-4 text-blue-500" />
                               <span className="text-[10px] font-bold text-slate-900 uppercase">86 cm</span>
                            </div>
                         </div>
                      </div>
                      
                      <div className="h-[400px] w-full">
                         <GrowthChart />
                      </div>
                   </div>
                )}
             </div>
          </div>

          <aside className="space-y-8">
             <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-premium relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-[0.3em] mb-10">Care Team Alpha</h4>
                <div className="space-y-8">
                   <TeamMember name="Dr. Julian Ross" role="Senior Paediatrician" />
                   <TeamMember name="Nurse Sarah Jenkins" role="Lead Nursery Specialist" />
                   <TeamMember name="Dr. Elena Vance" role="Nutritional Advisor" />
                </div>
             </div>

             <div className="bg-rose-100 rounded-[3rem] p-10 shadow-soft">
                <h4 className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-8">Next Milestones</h4>
                <div className="space-y-6">
                   <Milestone icon={Milk} label="Scheduled Feed" time="15:30" />
                   <Milestone icon={GraduationCap} label="Development Check" time="Tomorrow" />
                   <Milestone icon={ClipboardList} label="Weight Logic Sync" time="Monday" />
                </div>
             </div>
          </aside>
       </div>
    </motion.div>
  );
}

function VitalBox({ icon: Icon, label, val, unit, status, color }: any) {
  return (
    <div className={`p-6 rounded-[2.5rem] border-2 border-white shadow-soft ${color} transition-all hover:scale-105`}>
       <div className="flex justify-between items-start mb-6">
          <Icon className="h-6 w-6 opacity-60" />
          <span className="px-2 py-0.5 bg-white/40 rounded-full text-[8px] font-bold uppercase">{status}</span>
       </div>
       <div className="text-3xl font-bold font-display">{val}<span className="text-sm opacity-60 font-medium ml-1">{unit}</span></div>
       <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">{label}</div>
    </div>
  );
}

function GrowthChart() {
  const data = [
    { name: 'Jan', weight: 8.5, height: 72 },
    { name: 'Feb', weight: 9.0, height: 74 },
    { name: 'Mar', weight: 9.8, height: 76 },
    { name: 'Apr', weight: 10.5, height: 79 },
    { name: 'May', weight: 11.2, height: 82 },
    { name: 'Jun', weight: 12.4, height: 86 },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
        />
        <Tooltip 
          contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '10px', fontWeight: 800 }} 
        />
        <Line type="monotone" dataKey="weight" stroke="#f43f5e" strokeWidth={4} dot={{ r: 6, fill: '#f43f5e', strokeWidth: 4, stroke: '#fff' }} activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="height" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6', strokeWidth: 4, stroke: '#fff' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function TeamMember({ name, role }: any) {
  return (
    <div className="flex items-center gap-4 group">
       <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center font-bold text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
          {name.charAt(4)}
       </div>
       <div>
          <div className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors">{name}</div>
          <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{role}</div>
       </div>
    </div>
  );
}

function Milestone({ icon: Icon, label, time }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-rose-200/50">
       <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-rose-500" />
          <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{label}</span>
       </div>
       <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full">{time}</span>
    </div>
  );
}

function GrowthTrackingView() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
       <div className="bg-white rounded-[4rem] p-12 border-2 border-rose-50 shadow-clinical">
          <h3 className="text-2xl font-bold text-slate-900 italic serif mb-10">WHO Standards Comparison</h3>
          <div className="h-[400px]">
             <GrowthChart />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-10 text-center">Reference: WHO Growth Standards 2026</p>
       </div>
       <div className="space-y-8">
          <div className="bg-amber-50 rounded-[3rem] p-10 border-2 border-amber-100">
             <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-6">Development Progress</h4>
             <div className="space-y-4">
                <ProgressItem label="Social Response" level={85} />
                <ProgressItem label="Motor Skills" level={70} />
                <ProgressItem label="Cognitive Focus" level={92} />
             </div>
          </div>
          <div className="bg-[#FFF9F2] rounded-[3rem] p-10 border-2 border-rose-100">
             <h4 className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-6">Immunization Vault</h4>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-rose-50">
                   <span className="text-[10px] font-bold text-slate-900 uppercase">BCG / Polio 0</span>
                   <span className="text-[8px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full">Completed</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-rose-50">
                   <span className="text-[10px] font-bold text-slate-900 uppercase">Pentavalent 1</span>
                   <span className="text-[8px] font-bold text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded-full">Next Week</span>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

function ProgressItem({ label, level }: any) {
  return (
    <div className="space-y-2">
       <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-600 px-2">
          <span>{label}</span>
          <span>{level}%</span>
       </div>
       <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-amber-200/50">
          <motion.div initial={{ width: 0 }} animate={{ width: `${level}%` }} className="h-full bg-amber-400" />
       </div>
    </div>
  );
}
