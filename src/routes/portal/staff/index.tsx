import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../portal";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, setDoc, serverTimestamp, orderBy, onSnapshot, collectionGroup, limit } from "firebase/firestore";
import { Stethoscope, Users, Plus, Activity, ClipboardList, LogOut, ChevronRight, User, Search, Filter, Microscope, Thermometer, Heart, Droplets, Calendar, ShieldCheck, Save, Check, FileText, Table, Clock, Pill, Trash2, ShoppingCart, AlertCircle } from "lucide-react";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";
import { motion, AnimatePresence } from "motion/react";

export const Route = createFileRoute("/portal/staff/")({
  component: StaffDashboard,
});

function StaffDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<any>("vitals");
  const [records, setRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const tabs = [
    { id: "vitals", label: "Vital Signs", icon: Thermometer, color: "text-rose-500 bg-rose-50" },
    { id: "meds", label: "Drug Chart", icon: Pill, color: "text-blue-500 bg-blue-50" },
    { id: "careplan", label: "Care Plan", icon: Table, color: "text-emerald-500 bg-emerald-50" },
    { id: "pharmacy", label: "Pharmacy", icon: ShoppingCart, color: "text-indigo-500 bg-indigo-50" },
    { id: "investigations", label: "Lab & Imaging", icon: Microscope, color: "text-amber-500 bg-amber-50" },
    { id: "fluids", label: "Fluid Balance", icon: Droplets, color: "text-cyan-500 bg-cyan-100" },
    { id: "notes", label: "Progress Notes", icon: FileText, color: "text-amber-500 bg-amber-50" },
  ];

  const completionFields = ["fullName", "email", "age", "avatarUrl", "staffId", "department", "phoneNumber"];
  const completedCount = profile ? completionFields.filter(f => profile[f]).length : 0;
  const completionPercentage = profile ? Math.round((completedCount / completionFields.length) * 100) : 0;
  const isProfileComplete = profile && profile.fullName && profile.email && profile.age && profile.avatarUrl;

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  useEffect(() => {
    if (selectedPatient && isProfileComplete) fetchRecords();
  }, [selectedPatient, activeTab, isProfileComplete]);

  async function fetchData() {
    setLoading(true);
    try {
      const profRef = doc(db, "user_profiles", user!.uid);
      const profSnap = await getDoc(profRef);
      const profData = profSnap.data();
      
      if (!profData || (profData.role !== "staff" && profData.role !== "admin")) {
        setLoading(false);
        return;
      }
      setProfile(profData);

      if (profData.fullName && profData.email && profData.age && profData.avatarUrl) {
          const pQuery = profData.role === "admin" 
            ? collection(db, "patients")
            : query(collection(db, "patients"), where("assignedStaff", "array-contains", user!.uid));
          
          const pSnap = await getDocs(pQuery);
          setPatients(pSnap.docs.map(d => ({ id: d.id, ...d.data() as any })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileUpdate(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setSubmitting(true);
      const formData = new FormData(e.currentTarget);
      const data = {
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          age: formData.get("age"),
          avatarUrl: formData.get("avatarUrl") || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`,
          staffId: formData.get("staffId"),
          department: formData.get("department"),
          phoneNumber: formData.get("phoneNumber"),
          updatedAt: serverTimestamp(),
      };

      try {
          await setDoc(doc(db, "user_profiles", user!.uid), data, { merge: true });
          await fetchData();
          setIsEditingProfile(false);
      } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, "user_profiles");
      } finally {
          setSubmitting(false);
      }
  }

  async function fetchRecords() {
    if (!selectedPatient) return;
    setLoadingRecords(true);
    const pathMap: any = {
      vitals: "vitals",
      careplan: "care_plans",
      meds: "medications",
      fluids: "fluid_balance",
      notes: "nursing_notes"
    };

    const collPath = `patients/${selectedPatient.id}/${pathMap[activeTab]}`;
    try {
      const q = query(collection(db, collPath), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }

  async function handleRecordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data: any = {
      timestamp: serverTimestamp(),
      nurseId: user!.uid,
      nurseName: profile.fullName
    };

    formData.forEach((value, key) => {
      data[key] = value;
    });

    const pathMap: any = {
      vitals: "vitals",
      careplan: "care_plans",
      meds: "medications",
      fluids: "fluid_balance",
      notes: "nursing_notes"
    };

    const collPath = `patients/${selectedPatient.id}/${pathMap[activeTab]}`;
    try {
      await addDoc(collection(db, collPath), data);
      (e.target as HTMLFormElement).reset();
      fetchRecords();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, collPath);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const fluidTotal = activeTab === "fluids" ? records.reduce((acc: number, rec: any) => {
    const vol = parseFloat(rec.volume) || 0;
    return rec.type?.includes("Intake") ? acc + vol : acc - vol;
  }, 0) : 0;

  if (loading) return <div className="p-20 text-center animate-pulse italic">Synchronizing EMR Node...</div>;

  if (!isProfileComplete) {
      return (
          <div className="flex items-center justify-center p-6 min-h-[calc(100vh-100px)]">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl w-full bg-white rounded-[3rem] p-10 border border-emerald-100 shadow-premium"
              >
                  <div className="text-center mb-10">
                      <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                          <User className="h-8 w-8" />
                      </div>
                      <h1 className="text-2xl font-bold text-emerald-900 italic serif mb-2">Nurse Credential Entry</h1>
                      <p className="text-[9px] text-emerald-600/60 font-bold uppercase tracking-[0.3em]">Mandatory Profile Completion Required</p>
                      
                      <div className="mt-8">
                         <div className="flex justify-between items-center mb-2">
                           <span className="text-[10px] font-bold text-emerald-600 uppercase">Profile Completion</span>
                           <span className="text-[10px] font-bold text-emerald-900">{completionPercentage}%</span>
                         </div>
                         <div className="h-1.5 w-full bg-emerald-50 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${completionPercentage}%` }}
                             className="h-full bg-emerald-500"
                           />
                         </div>
                      </div>
                  </div>

                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <EMRInput label="Full Name" name="fullName" defaultValue={profile?.fullName} placeholder="Jane Doe" required />
                        <EMRInput label="Primary Email" name="email" type="email" defaultValue={profile?.email} placeholder="jane@primevita.care" required />
                        <EMRInput label="Age" name="age" type="number" defaultValue={profile?.age} required />
                        <EMRInput label="Staff ID" name="staffId" defaultValue={profile?.staffId} placeholder="NUR-2024-001" />
                        <EMRInput label="Department" name="department" defaultValue={profile?.department} placeholder="Emergency Medicine" />
                        <EMRInput label="Phone Number" name="phoneNumber" defaultValue={profile?.phoneNumber} placeholder="+1 (555) 000-0000" />
                        <div className="md:col-span-2">
                          <EMRInput label="Profile Photo URL" name="avatarUrl" defaultValue={profile?.avatarUrl} placeholder="Direct link to passport photo" />
                        </div>
                      </div>
                      
                      <div className="pt-6 border-t border-emerald-50">
                          <button 
                            disabled={submitting}
                            type="submit" 
                            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-premium hover:shadow-glow transition-all"
                          >
                              {submitting ? "Authenticating Data..." : "Apply Credentials & Access Portal"}
                          </button>
                      </div>
                  </form>
              </motion.div>
          </div>
      );
  }

  return (
    <div className="flex-1 overflow-y-auto relative bg-[#F8FAFC]">
        {profile && <AlertBar patientId={selectedPatient?.id} />}
        <AnimatePresence mode="wait">
          {selectedPatient ? (
            <motion.div 
              key={selectedPatient.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8"
            >
              <div className="bg-white rounded-[2.5rem] p-8 border border-emerald-100 shadow-clinical mb-8">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6">
                       <div className="h-16 w-16 rounded-[1.5rem] bg-emerald-600 text-white flex items-center justify-center shadow-premium">
                          <User className="h-8 w-8" />
                       </div>
                       <div>
                          <div className="flex items-center gap-3">
                             <h1 className="text-3xl font-bold text-emerald-900 tracking-tight font-display italic serif">{selectedPatient.name}</h1>
                             <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-bold uppercase tracking-widest">Active EMR</span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600/60">
                             <span className="flex items-center gap-1.5"><Table className="h-3.5 w-3.5" /> Room 402</span>
                             <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Admitted: 2 days ago</span>
                             <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> HIPAA Secured</span>
                          </div>
                       </div>
                    </div>
                    <div className="flex bg-emerald-50 p-1.5 rounded-2xl border border-emerald-100">
                       {tabs.map((tab) => (
                          <button
                             key={tab.id}
                             onClick={() => setActiveTab(tab.id as any)}
                             className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                activeTab === tab.id 
                                ? "bg-white text-emerald-600 shadow-soft border border-emerald-100" 
                                : "text-emerald-900/40 hover:text-emerald-600"
                             }`}
                          >
                             <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? tab.color.split(' ')[0] : ""}`} />
                             <span className="hidden lg:inline">{tab.label}</span>
                          </button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="grid lg:grid-cols-[1fr_350px] gap-8">
                 <div className="space-y-8">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-border shadow-clinical">
                       <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-widest mb-8 flex items-center gap-3 italic serif">
                          <Plus className="h-4 w-4 bg-emerald-600 text-white rounded-md p-1" /> Document {tabs.find(t => t.id === activeTab)?.label}
                       </h3>
                       
                          {activeTab === "pharmacy" && (
                            <PrescriptionManager patientId={selectedPatient.id} />
                          )}

                          {activeTab === "investigations" && (
                            <InvestigationRequestManager patientId={selectedPatient.id} />
                          )}

                          {activeTab !== "pharmacy" && activeTab !== "investigations" && (
                             <form onSubmit={handleRecordSubmit}>
                          {activeTab === "vitals" && (
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <EMRInput label="Temp (°C)" name="temp" type="number" step="0.1" placeholder="36.5" />
                                <div className="grid grid-cols-2 gap-2">
                                   <EMRInput label="Systolic" name="bp_systolic" type="number" placeholder="120" />
                                   <EMRInput label="Diastolic" name="bp_diastolic" type="number" placeholder="80" />
                                </div>
                                <EMRInput label="Pulse Rate" name="pulse" type="number" placeholder="72" />
                                <EMRInput label="Resp Rate" name="resp" type="number" placeholder="16" />
                                <EMRInput label="O2 Sat (%)" name="o2" type="number" placeholder="98" />
                                <EMRInput label="Glucose" name="glucose" type="number" step="0.1" placeholder="5.5" />
                             </div>
                          )}

                          {activeTab === "meds" && (
                             <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   <EMRInput label="Drug Name" name="drugName" />
                                   <EMRInput label="Dosage" name="dosage" placeholder="500mg" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                   <EMRSelect label="Frequency" name="frequency" options={["BD (Morning/Night)", "TDS (Morning/Afternoon/Night)", "QDS (00/06/12/18)", "PRN (As Needed)"]} />
                                   <EMRInput label="Duration" name="duration" placeholder="e.g. 5 Days" />
                                   <EMRSelect label="Route" name="route" options={["Oral", "IV", "IM", "SC"]} />
                                </div>
                             </div>
                          )}

                          {activeTab === "careplan" && (
                             <div className="space-y-6">
                                <EMRInput label="Nursing Diagnosis" name="diagnosis" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                   <EMRInput label="Clinical Goals" name="goals" />
                                   <EMRInput label="Interventions" name="interventions" />
                                   <EMRInput label="Evaluation" name="evaluation" />
                                </div>
                             </div>
                          )}

                          {activeTab === "fluids" && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <EMRSelect label="Entry Type" name="type" options={["Intake (Oral)", "Intake (IV)", "Output (Urine)", "Output (Drain)"]} />
                                <EMRInput label="Volume (ml)" name="volume" type="number" />
                             </div>
                          )}

                          {activeTab === "notes" && (
                             <div className="space-y-4">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/60">Nursing Progress Narrative</label>
                                <textarea 
                                   name="report" 
                                   rows={5} 
                                   className="w-full bg-[#F8FAFC] border border-emerald-100 rounded-2xl p-5 text-sm font-medium outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-300 transition-all resize-none italic"
                                   placeholder="Detail behavioral changes, physical assessments, and patient response to treatment..."
                                />
                             </div>
                          )}

                          <div className="mt-8 pt-8 border-t border-emerald-50 flex items-center justify-between">
                             <span className="text-[9px] font-bold text-emerald-600/40 uppercase tracking-widest">Authorized Entry by: {profile.fullName}</span>
                             <button 
                                disabled={submitting}
                                type="submit" 
                                className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-premium hover:shadow-glow transition-all flex items-center gap-2 disabled:opacity-50"
                             >
                                {submitting ? "Synchronizing..." : <><Save className="h-3.5 w-3.5" /> Commit Entry</>}
                             </button>
                          </div>
                       </form>
                       )}
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center gap-4">
                          <h4 className="text-xl font-bold text-emerald-900 tracking-tight italic serif">Clinical History</h4>
                          <div className="h-px bg-emerald-100 flex-1" />
                       </div>

                       {loadingRecords ? (
                          <div className="flex flex-col items-center py-20 gap-4 opacity-30">
                             <Clock className="h-10 w-10 animate-spin" />
                             <p className="text-[10px] font-bold uppercase tracking-widest">Querying Vault...</p>
                          </div>
                       ) : records.length === 0 ? (
                          <div className="bg-white rounded-[2rem] p-20 text-center border-2 border-dashed border-emerald-100">
                             <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-200">
                                <Search className="h-6 w-6" />
                             </div>
                             <p className="text-xs text-muted-foreground font-medium italic">No entries for this module.</p>
                          </div>
                       ) : (
                          <div className="space-y-4">
                             {records.map((rec) => (
                                <motion.div 
                                   initial={{ opacity: 0, y: 5 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   key={rec.id} 
                                   className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-soft flex flex-col md:flex-row gap-6 relative overflow-hidden group"
                                >
                                   <div className="w-40 shrink-0">
                                      <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
                                         {rec.timestamp ? new Date(rec.timestamp.seconds * 1000).toLocaleDateString() : 'Pending...'}
                                      </div>
                                      <div className="text-lg font-bold text-emerald-900 tracking-tight">
                                         {rec.timestamp ? new Date(rec.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Syncing'}
                                      </div>
                                      <div className="mt-4 flex items-center gap-2">
                                         <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[8px] font-bold uppercase">{rec.nurseName?.charAt(0)}</div>
                                         <span className="text-[9px] font-bold text-emerald-600/40 uppercase">Nurse {rec.nurseName?.split(' ')[0]}</span>
                                      </div>
                                   </div>
                                   
                                   <div className="flex-1 space-y-4">
                                      {activeTab === "vitals" && (
                                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {rec.temp && <StaffVitalChip label="TEMP" val={`${rec.temp}°C`} />}
                                            {rec.bp_systolic && <StaffVitalChip label="BP" val={`${rec.bp_systolic}/${rec.bp_diastolic}`} />}
                                            {rec.pulse && <StaffVitalChip label="PULSE" val={rec.pulse} />}
                                            {rec.o2 && <StaffVitalChip label="SpO2" val={`${rec.o2}%`} />}
                                            {rec.glucose && <StaffVitalChip label="GLUCOSE" val={`${rec.glucose} mmol/L`} />}
                                         </div>
                                      )}
                                      {activeTab === "meds" && (
                                         <div>
                                            <div className="font-bold text-emerald-900 text-lg italic serif">{rec.drugName} <span className="opacity-40 italic text-sm">- {rec.dosage}</span></div>
                                            <div className="flex flex-wrap items-center gap-4 mt-2">
                                               <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-blue-50 text-blue-600 rounded">FREQ: {rec.frequency}</span>
                                               <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-purple-50 text-purple-600 rounded">DUR: {rec.duration}</span>
                                               <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-500 rounded">ROUTE: {rec.route}</span>
                                            </div>
                                         </div>
                                      )}
                                      {activeTab === "notes" && (
                                         <p className="text-muted-foreground text-sm leading-relaxed italic serif">{rec.report}</p>
                                      )}
                                      {activeTab === "fluids" && (
                                         <div className="flex items-center gap-4">
                                            <div className={`px-4 py-2 rounded-xl text-sm font-bold ${rec.type.includes('Intake') ? 'bg-cyan-50 text-cyan-700' : 'bg-amber-50 text-amber-700'}`}>
                                               {rec.type}
                                            </div>
                                            <div className="text-2xl font-bold font-display italic serif">{rec.volume} <span className="text-xs uppercase opacity-30">ml</span></div>
                                         </div>
                                      )}
                                      {activeTab === "careplan" && (
                                         <div className="space-y-3">
                                            <div className="font-bold text-emerald-900 border-b border-emerald-50 pb-2 italic serif">{rec.diagnosis}</div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                               <div>
                                                  <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-600/40 mb-1">Target Goals</div>
                                                  <div className="text-[13px] font-medium text-emerald-900/80">{rec.goals}</div>
                                               </div>
                                               <div>
                                                  <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-600/40 mb-1">Interventions</div>
                                                  <div className="text-[13px] font-medium text-emerald-900/80">{rec.interventions}</div>
                                               </div>
                                               <div>
                                                  <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-600/40 mb-1">Evaluation</div>
                                                  <div className="text-[13px] font-medium text-emerald-900/80">{rec.evaluation}</div>
                                               </div>
                                            </div>
                                         </div>
                                      )}
                                   </div>
                                </motion.div>
                             ))}
                          </div>
                       )}
                    </div>
                 </div>

                 <div className="space-y-8">
                    <div className="bg-white rounded-[2.5rem] p-8 border border-emerald-100 shadow-clinical">
                       <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-900 mb-6 flex items-center justify-between">
                          Subject Profile <Check className="h-3 w-3 text-emerald-600" />
                       </h4>
                       <div className="space-y-6">
                          <ContextItem label="Allergies" val={selectedPatient.allergies || "NKDA (None Known)"} color="text-rose-600" />
                          <ContextItem label="Primary Diagnosis" val={selectedPatient.condition} />
                          <ContextItem label="Blood Type" val="O+ (Verified)" />
                          <ContextItem label="DNR Status" val="Full Code" />
                       </div>
                    </div>

                    <div className="bg-emerald-900 rounded-[2.5rem] p-8 text-white shadow-premium relative overflow-hidden group">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl transition-transform group-hover:scale-150 duration-700" />
                       <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 mb-8">Clinical Summary</h4>
                       <div className="space-y-8 relative z-10">
                          <div>
                             <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Daily Fluid Balance</div>
                             <div className="text-3xl font-bold font-display tracking-tight">
                               {fluidTotal > 0 ? "+" : ""}{fluidTotal.toLocaleString()} <span className="text-xs opacity-40">ml Net</span>
                             </div>
                          </div>
                          <div>
                             <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Medication Sync</div>
                             <div className="text-xl font-bold font-display opacity-90 italic serif tracking-tight">3/4 Administered</div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          ) : isEditingProfile ? (
            <div className="p-12 max-w-4xl mx-auto">
               <div className="bg-white rounded-[3rem] p-12 border border-emerald-100 shadow-premium">
                  <div className="flex items-center justify-between mb-10">
                     <h2 className="text-2xl font-bold text-emerald-900 italic serif">Refine Professional Data</h2>
                     <button onClick={() => setIsEditingProfile(false)} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-emerald-600">Cancel</button>
                  </div>
                  <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <EMRInput label="Full Name" name="fullName" defaultValue={profile.fullName} required />
                      <EMRInput label="Primary Email" name="email" defaultValue={profile.email} required />
                      <EMRInput label="Age" name="age" defaultValue={profile.age} required />
                      <EMRInput label="Staff ID" name="staffId" defaultValue={profile.staffId} />
                      <EMRInput label="Department" name="department" defaultValue={profile.department} />
                      <EMRInput label="Phone" name="phoneNumber" defaultValue={profile.phoneNumber} />
                      <div className="md:col-span-2">
                        <EMRInput label="Photo URL" name="avatarUrl" defaultValue={profile.avatarUrl} />
                      </div>
                      <div className="md:col-span-2 pt-6">
                         <button type="submit" disabled={submitting} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-glow">
                            {submitting ? "Updating Registry..." : "Save Professional Changes"}
                         </button>
                      </div>
                  </form>
               </div>
            </div>
          ) : (
            <div className="p-12 space-y-12">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                     <div className="bg-white rounded-[3rem] p-10 border border-emerald-100 shadow-clinical flex flex-col md:flex-row items-center gap-10">
                        <div className="h-32 w-32 rounded-[2.5rem] overflow-hidden bg-emerald-50 border-4 border-white shadow-premium">
                           <img src={profile.avatarUrl} alt="Nurse Passport" className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                           <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
                              <h2 className="text-3xl font-bold text-emerald-900 italic serif">{profile.fullName}</h2>
                              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-bold uppercase tracking-widest w-fit mx-auto md:mx-0">Verified RN</span>
                           </div>
                           <p className="text-emerald-600/60 font-medium mb-6">{profile.email} • {profile.department || "General Nursing"}</p>
                           <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                              <button 
                                onClick={() => setIsEditingProfile(true)}
                                className="px-6 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 transition-all"
                              >
                                Edit Profile
                              </button>
                              <div className="px-6 py-2 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-100">
                                ID: {profile.staffId || "UNASSIGNED"}
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white rounded-[2.5rem] p-8 border border-emerald-100 shadow-soft">
                           <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-6">Credential Status</h4>
                           <div className="space-y-4">
                              <div className="flex justify-between items-center text-sm font-medium">
                                 <span className="text-emerald-900/60">Profile Completeness</span>
                                 <span className="text-emerald-900 font-bold">{completionPercentage}%</span>
                              </div>
                              <div className="h-2 w-full bg-emerald-50 rounded-full overflow-hidden">
                                 <div className="h-full bg-emerald-500" style={{ width: `${completionPercentage}%` }} />
                              </div>
                              <p className="text-[10px] text-muted-foreground italic">Your professional profile is verified for clinical operations.</p>
                           </div>
                        </div>
                        <div className="bg-emerald-900 rounded-[2.5rem] p-8 text-white shadow-premium">
                           <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-6">Case Summary</h4>
                           <div className="flex items-end justify-between">
                              <div>
                                 <div className="text-4xl font-bold font-display">{patients.length}</div>
                                 <div className="text-[10px] font-bold uppercase tracking-widest opacity-40">Assigned Patients</div>
                              </div>
                              <Users className="h-10 w-10 opacity-20" />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="bg-white rounded-[3rem] p-8 border border-emerald-100 shadow-clinical">
                     <h4 className="text-[10px] font-bold text-emerald-900 uppercase tracking-widest mb-8 flex items-center justify-between">
                        Case Directory <ChevronRight className="h-3 w-3" />
                     </h4>
                     <div className="space-y-4">
                        {patients.map(p => (
                           <button 
                             key={p.id}
                             onClick={() => setSelectedPatient(p)}
                             className="w-full p-4 rounded-2xl bg-[#F8FAFC] border border-emerald-50 text-left hover:border-emerald-200 transition-all group"
                           >
                              <div className="font-bold text-emerald-900 text-sm group-hover:text-emerald-600 transition-colors">{p.name}</div>
                              <div className="flex items-center justify-between mt-1">
                                 <span className="text-[9px] font-bold text-emerald-600/40 uppercase">ID: {p.id.slice(0, 6)}</span>
                                 <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">Open EMR <ChevronRight className="h-3 w-3" /></span>
                              </div>
                           </button>
                        ))}
                        {patients.length === 0 && (
                           <div className="text-center py-10">
                              <div className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">No Cases Assigned</div>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          )}
        </AnimatePresence>
    </div>
  );
}

function PrescriptionManager({ patientId }: { patientId: string }) {
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

    const orderData = {
      patientId,
      drugName,
      dosage,
      quantity,
      status: "pending",
      prescribedBy: user!.uid,
      createdAt: serverTimestamp(),
      type: "hospital_fulfillment"
    };

    try {
      await addDoc(collection(db, "pharmacy_orders"), orderData);
      await fetchData();
      (e.target as HTMLFormElement).reset();
      alert("Prescription sent to pharmacy node.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "pharmacy_orders");
    } finally {
      setPrescribing(false);
    }
  }

  if (loading) return <div className="p-20 text-center animate-pulse italic text-indigo-300 uppercase text-[10px] font-bold tracking-widest">Synchronizing Vault Status...</div>;

  return (
    <div className="space-y-12">
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
             <form onSubmit={handlePrescribe} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">New Pharmacy Transaction</h4>
                
                <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2">Stock Inventory</label>
                      <select name="drugName" required className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none">
                         <option value="">Select Drug...</option>
                         {inventory.filter(i => i.stockLevel > 0).map(i => (
                            <option key={i.id} value={i.name}>{i.name} ({i.stockLevel} units)</option>
                         ))}
                      </select>
                   </div>
                   
                   <EMRInput label="Precise Dosage" name="dosage" placeholder="500mg BID x5" required />
                   <EMRInput label="Quantity" name="quantity" type="number" required />
                </div>

                <button 
                  type="submit" 
                  disabled={prescribing}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-bold text-[10px] uppercase tracking-[0.2em] shadow-premium hover:shadow-glow transition-all flex items-center justify-center gap-3"
                >
                   <Pill className="h-4 w-4" /> Send to Pharmacy
                </button>
             </form>
          </div>

          <div className="space-y-6">
             <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fulfillment Log</h4>
             <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin">
                {orders.map(order => (
                   <div key={order.id} className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center justify-between group hover:border-indigo-200 transition-all shadow-soft">
                      <div>
                         <div className="text-sm font-bold text-slate-900 italic serif">{order.drugName}</div>
                         <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{order.dosage} • Q: {order.quantity}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${order.status === 'dispensed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                         {order.status}
                      </div>
                   </div>
                ))}
                {orders.length === 0 && <p className="text-[10px] font-bold uppercase text-slate-300 py-10 text-center tracking-widest">No fulfillment history</p>}
             </div>
          </div>
       </div>
    </div>
  );
}

function StaffVitalChip({ label, val }: { label: string; val: any }) {
  return (
    <div className="bg-emerald-50/50 rounded-2xl px-4 py-3 flex items-center justify-between border border-emerald-100/50">
      <span className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest">{label}</span>
      <span className="text-[12px] font-bold text-emerald-900 italic serif">{val}</span>
    </div>
  );
}

function EMRInput({ label, name, type = "text", placeholder, step, defaultValue, required }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/60">{label}</label>
      <input 
        name={name} 
        type={type} 
        step={step}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-[#F8FAFC] border border-emerald-100 rounded-2xl px-5 py-4 text-sm font-bold text-emerald-900 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-300 transition-all placeholder:font-normal placeholder:opacity-30" 
      />
    </div>
  );
}

function EMRSelect({ label, name, options }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/60">{label}</label>
      <select 
        name={name}
        className="w-full bg-[#F8FAFC] border border-emerald-100 rounded-2xl px-5 py-4 text-sm font-bold text-emerald-900 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-300 transition-all appearance-none"
      >
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function ContextItem({ label, val, color = "text-emerald-900" }: any) {
  return (
    <div>
       <div className="text-[9px] font-bold text-emerald-600/40 uppercase tracking-widest mb-1">{label}</div>
       <div className={`text-[13px] font-bold ${color} italic serif`}>{val}</div>
    </div>
  );
}

function InvestigationRequestManager({ patientId }: { patientId: string }) {
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
      const q = query(collectionGroup(db, "investigations"), where("patientId", "==", patientId), orderBy("requestedAt", "desc"), limit(20));
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
      department: "Diagnostic"
    };

    try {
      // Add to patient's subcollection for consistency
      await addDoc(collection(db, "patients", patientId, "investigations"), reqData);
      
      // Global alert for the team
      await addDoc(collection(db, "alerts"), {
          patientId,
          type: "investigation_requested",
          message: `New ${category} (${type}) requested. Urgency: ${urgency}`,
          priority: urgency === "STAT" ? "high" : "normal",
          status: "active",
          createdAt: serverTimestamp(),
          targetDept: category === "Laboratory" ? "lab" : "radiology"
      });

      await fetchHistory();
      (e.target as HTMLFormElement).reset();
      alert("Order broadcasted to Diagnostic node.");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "investigations");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
       <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
          <form onSubmit={handleRequest} className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-inner space-y-8">
             <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Diagnostic Order Form</h4>
                <div className="h-2 w-2 rounded-full bg-amber-400 shadow-glow animate-pulse" />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EMRSelect label="Category" name="category" options={["Laboratory", "Radiology"]} />
                <EMRSelect label="Urgency" name="urgency" options={["Routine", "Urgent", "STAT"]} />
             </div>
             
             <EMRInput label="Specific Test/Study" name="type" placeholder="e.g. FBC, Chest X-Ray, CT Scan" required />

             <button 
                type="submit" 
                disabled={submitting}
                className="w-full h-16 bg-[#0f172a] text-white rounded-[2rem] font-bold text-[10px] uppercase tracking-[0.3em] shadow-premium hover:shadow-glow transition-all flex items-center justify-center gap-3"
             >
                <Plus className="h-4 w-4" /> Finalize & Broadcast
             </button>
          </form>

          <div className="space-y-6">
             <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">Diagnostic History</h4>
             <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {history.map(item => (
                   <div key={item.id} className="p-6 bg-white border border-slate-100 rounded-[2.5rem] flex items-center justify-between group hover:border-amber-200 shadow-soft transition-all">
                      <div>
                         <div className="text-sm font-bold text-slate-900 italic serif">{item.type}</div>
                         <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {item.category} • {item.urgency}
                         </div>
                      </div>
                      <div className={`px-4 py-1 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                         {item.status}
                      </div>
                   </div>
                ))}
                {history.length === 0 && <p className="p-12 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">No diagnostic records found</p>}
             </div>
          </div>
       </div>
    </div>
  );
}

function AlertBar({ patientId }: { patientId?: string }) {
   const [alerts, setAlerts] = useState<any[]>([]);

   useEffect(() => {
      const q = query(collection(db, "alerts"), where("status", "==", "active"), limit(5));
      const unsubscribe = onSnapshot(q, (snap) => {
         setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => {
         console.error("Alerts sync failed", err);
      });
      return () => unsubscribe();
   }, []);

   if (alerts.length === 0) return null;

   return (
      <div className="bg-rose-500 text-white py-2 px-8 flex items-center gap-6 overflow-hidden">
         <div className="flex items-center gap-2 whitespace-nowrap">
            <AlertCircle className="h-4 w-4 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Global Alerts Node:</span>
         </div>
         <div className="flex gap-10 animate-marquee">
            {alerts.map(a => (
               <span key={a.id} className="text-[10px] font-bold uppercase tracking-widest opacity-90">
                  [{a.priority}] {a.message} • {new Date(a.createdAt?.seconds * 1000).toLocaleTimeString()}
               </span>
            ))}
         </div>
      </div>
   );
}
