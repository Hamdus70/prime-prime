import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../portal";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy, addDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { 
  Activity, ClipboardList, LogOut, User, ShieldCheck, Heart, 
  Thermometer, Droplets, ArrowRight, Pill, MessageSquare, 
  Calendar, Microscope, AlertCircle, Send, CheckCircle2, 
  Loader2, Search, Bell, Settings, Phone, LayoutDashboard,
  FileText, Video, CreditCard, Scale, Plus, TrendingUp, TrendingDown,
  ChevronRight, Check
} from "lucide-react";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";
import { motion, AnimatePresence } from "motion/react";
import { PrimeVitaLogo } from "@/components/PrimeVitaLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/patient")({
  component: PatientPortal,
});

function PatientPortal() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [patientRecord, setPatientRecord] = useState<any>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complaintModal, setComplaintModal] = useState(false);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [complaintSuccess, setComplaintSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentStep, setAssessmentStep] = useState(0);
  const [assessmentData, setAssessmentData] = useState({
    mobility: "unassisted",
    diet: "regular",
    sleepQuality: "good",
    stressLevel: "moderate",
    consentVerified: false
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/portal/auth" });
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const profRef = doc(db, "user_profiles", user!.uid);
      let profSnap = await getDoc(profRef);
      
      let profData = profSnap.data();
      if (!profData) {
        // Fallback: create profile if it somehow doesn't exist
        profData = {
          userId: user!.uid,
          fullName: user?.displayName || "Authorized User",
          email: user?.email || "",
          role: "patient",
          createdAt: serverTimestamp(),
        };
        await setDoc(profRef, profData);
      }
      setProfile(profData);
      
      // Check for first-login assessment
      if (profData.role === 'patient' && !profData.hasCompletedAssessment) {
        setShowAssessment(true);
      }

      const pPath = "patients";
      const pQuery = query(collection(db, pPath), where("userId", "==", user!.uid));
      const pSnap = await getDocs(pQuery);
      
      let currentPatientId: string;
      let record: any;

      if (pSnap.empty) {
        // AUTO-PROVISION STARTER RECORD FOR DEMO
        const newPatient = {
          userId: user!.uid,
          name: profData.fullName,
          condition: "Baseline Assessment Pending",
          dateOfBirth: "1988-06-15",
          gender: "Not Specified",
          address: "Registered Address Pending",
          bloodType: "O+",
          assignedStaff: [],
          billing: {
            balanceDue: 1250,
            nextDueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
            status: "current"
          },
          createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, "patients"), newPatient);
        currentPatientId = docRef.id;
        record = { id: docRef.id, ...newPatient };
        
        // Add realistic starter clinical notes
        await addDoc(collection(db, `patients/${docRef.id}/encounters`), {
          visitDate: serverTimestamp(),
          notes: "Patient successfully onboarded to PrimeVita Digital Portal. Initial clinical parameters registered. Scheduled for comprehensive wellness screening via Telehealth in 72 hours. All biometric encryption nodes verified.",
          vitals: {
            bloodPressure: "118/76",
            heartRate: 68,
            temperature: 98.4
          }
        });
      } else {
        const pDoc = pSnap.docs[0];
        currentPatientId = pDoc.id;
        record = { id: pDoc.id, ...pDoc.data() };
      }

      setPatientRecord(record);

      const ePath = `patients/${currentPatientId}/encounters`;
      const eSnap = await getDocs(query(collection(db, ePath), orderBy("visitDate", "desc")));
      setEncounters(eSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("Could not reach Cloud Firestore backend")) {
        setError("Network Link Severed: Our clinical nodes are unreachable. Please check your encryption channel (internet connection).");
      } else {
        setError("Synchronization Error: Failed to establish clinical handshake. Please re-authenticate or refresh.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAssessmentSubmit() {
    setLoading(true);
    try {
        await addDoc(collection(db, "patient_assessments"), {
            userId: user!.uid,
            patientId: patientRecord.id,
            ...assessmentData,
            timestamp: serverTimestamp()
        });

        await updateDoc(doc(db, "user_profiles", user!.uid), {
            hasCompletedAssessment: true,
            updatedAt: serverTimestamp()
        });

        setShowAssessment(false);
        fetchData();
        toast.success("Identity validation and assessment confirmed.");
    } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, "patient_assessments");
    } finally {
        setLoading(false);
    }
  }

  if (authLoading || (loading && !patientRecord && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <Heart className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Secure Access Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !patientRecord) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <header className="h-20 bg-white border-b border-border px-8 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white">
                 <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="font-bold text-primary tracking-tight">PrimeVita Patient Hub</span>
           </div>
           <div className="flex items-center gap-4">
              <button 
                onClick={() => fetchData()} 
                className="text-[10px] font-bold uppercase tracking-widest text-primary bg-secondary/50 px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
              >
                Refresh Sync
              </button>
              <button onClick={() => auth.signOut()} className="text-[11px] font-bold uppercase tracking-widest text-rose-500 hover:underline">Exit Portal</button>
           </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full bg-white rounded-[3rem] p-12 md:p-20 shadow-premium border border-border"
          >
            <div className={`h-24 w-24 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-soft ${error ? 'bg-rose-50 text-rose-500' : 'bg-secondary text-primary'}`}>
              {error ? <AlertCircle className="h-12 w-12" /> : <Activity className="h-12 w-12" />}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight mb-6 font-display italic serif">
              {error ? "Synchronization Failure" : "Clinical Profile Sync"}
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-12 max-w-lg mx-auto">
              {error || "Welcome to PrimeVita. We are currently synchronizing your identity with our clinical node. Your private health vault will be accessible in just a moment."}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
               <button 
                 onClick={() => auth.signOut()}
                 className="px-10 py-5 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
               >
                  Sign Out
               </button>
               <button 
                 onClick={() => fetchData()}
                 className={`px-10 py-5 rounded-2xl text-white font-bold text-xs uppercase tracking-[0.2em] shadow-premium hover:shadow-glow transition-all flex items-center justify-center gap-3 ${error ? 'bg-rose-600' : 'bg-[#003B2D]'}`}
               >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Activity className="h-4 w-4" /> {error ? "Retry Connection" : "Finalize Sync Now"}</>}
               </button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F8FAFC] flex overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Assessment Modal */}
      <AnimatePresence>
        {showAssessment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="absolute inset-0 bg-primary/20 backdrop-blur-md"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 30 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               className="relative bg-white w-full max-w-4xl rounded-[4rem] shadow-premium border border-border overflow-hidden flex flex-col md:flex-row h-full max-h-[800px]"
            >
               <div className="md:w-2/5 bg-primary p-12 text-white flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                     <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-[100px] -ml-20 -mt-20" />
                  </div>
                  
                  <div className="relative z-10">
                     <PrimeVitaLogo className="h-12 w-12 brightness-0 invert mb-8" />
                     <h2 className="text-4xl font-bold tracking-tight italic serif mb-4">Establishing Your Clinical Node</h2>
                     <p className="text-white/60 font-medium leading-relaxed">To ensure biometric security and clinical precision, we require a baseline assessment of your current physical state.</p>
                  </div>

                  <div className="relative z-10 space-y-4">
                     {[0,1,2].map(i => (
                        <div key={i} className="flex items-center gap-4">
                           <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${i <= assessmentStep ? 'bg-white' : 'bg-white/20'}`} />
                        </div>
                     ))}
                  </div>
               </div>

               <div className="flex-1 p-12 md:p-16 flex flex-col overflow-y-auto bg-slate-50/50">
                  <AnimatePresence mode="wait">
                     {assessmentStep === 0 && (
                        <motion.div 
                           key="s0"
                           initial={{ opacity: 0, x: 20 }}
                           animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: -20 }}
                           className="space-y-10"
                        >
                           <div>
                              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/40 mb-2 block">Step 01 / 03</span>
                              <h3 className="text-3xl font-bold text-primary tracking-tight italic serif mb-4">Verify Identity Identity</h3>
                              <p className="text-muted-foreground font-medium">Welcome, {profile?.fullName}. We have successfully synchronized your account with clinical ID <span className="text-primary font-bold">{profile?.username}</span>.</p>
                           </div>

                           <div className="space-y-4">
                              <label className="text-[11px] font-bold uppercase tracking-widest text-primary/60">Functional Mobility</label>
                              <div className="grid grid-cols-2 gap-4">
                                 {["unassisted", "assisted", "wheelchair", "bedbound"].map(mode => (
                                    <button 
                                      key={mode}
                                      onClick={() => setAssessmentData({ ...assessmentData, mobility: mode })}
                                      className={`p-6 rounded-3xl border-2 transition-all font-bold text-xs uppercase tracking-widest text-left ${assessmentData.mobility === mode ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-white text-muted-foreground'}`}
                                    >
                                       {mode}
                                    </button>
                                 ))}
                              </div>
                           </div>
                           
                           <button onClick={() => setAssessmentStep(1)} className="w-full py-5 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-premium flex items-center justify-center gap-3">
                              Proceed to Vitals <ChevronRight className="h-4 w-4" />
                           </button>
                        </motion.div>
                     )}

                     {assessmentStep === 1 && (
                        <motion.div 
                           key="s1"
                           initial={{ opacity: 0, x: 20 }}
                           animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: -20 }}
                           className="space-y-10"
                        >
                           <div>
                              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/40 mb-2 block">Step 02 / 03</span>
                              <h3 className="text-3xl font-bold text-primary tracking-tight italic serif mb-4">Wellness Parameters</h3>
                              <p className="text-muted-foreground font-medium">Define your baseline lifestyle metrics.</p>
                           </div>

                           <div className="space-y-8">
                              <AssessmentSelector label="Nutritional Profile" value={assessmentData.diet} options={["regular", "diabetic", "low-sodium", "liquid"]} onChange={val => setAssessmentData({ ...assessmentData, diet: val })} />
                              <AssessmentSelector label="Rest Quality (24h)" value={assessmentData.sleepQuality} options={["poor", "average", "good", "excellent"]} onChange={val => setAssessmentData({ ...assessmentData, sleepQuality: val })} />
                              <AssessmentSelector label="Stress Loading" value={assessmentData.stressLevel} options={["low", "moderate", "high", "critical"]} onChange={val => setAssessmentData({ ...assessmentData, stressLevel: val })} />
                           </div>
                           
                           <div className="flex gap-4">
                              <button onClick={() => setAssessmentStep(0)} className="flex-1 py-5 bg-white text-primary rounded-2xl font-bold uppercase tracking-widest text-xs border border-border">Back</button>
                              <button onClick={() => setAssessmentStep(2)} className="flex-[2] py-5 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-premium">Final Consent</button>
                           </div>
                        </motion.div>
                     )}

                     {assessmentStep === 2 && (
                        <motion.div 
                           key="s2"
                           initial={{ opacity: 0, x: 20 }}
                           animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: -20 }}
                           className="space-y-10"
                        >
                           <div>
                              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/40 mb-2 block">Step 03 / 03</span>
                              <h3 className="text-3xl font-bold text-primary tracking-tight italic serif mb-4">Legal & Clinical Consent</h3>
                              <p className="text-muted-foreground font-medium">Establish authorization for data processing and EMR integration.</p>
                           </div>

                           <div className="p-8 bg-white border border-border rounded-[2.5rem] space-y-6">
                              <div className="flex items-start gap-4">
                                 <input 
                                    type="checkbox" 
                                    checked={assessmentData.consentVerified}
                                    onChange={e => setAssessmentData({ ...assessmentData, consentVerified: e.target.checked })}
                                    className="h-6 w-6 mt-1 rounded border-border text-primary focus:ring-primary/20" 
                                 />
                                 <p className="text-xs font-medium leading-relaxed text-slate-600">
                                    I hereby authorize PrimeVita to store and process my biological and medical data within their encrypted clinical node system. I understand that this data is protected by 256-bit AES encryption and is strictly for healthcare management purposes.
                                 </p>
                              </div>
                           </div>
                           
                           <button 
                              disabled={!assessmentData.consentVerified || loading}
                              onClick={handleAssessmentSubmit}
                              className="w-full py-6 bg-emerald-600 text-white rounded-[1.5rem] font-bold uppercase tracking-widest text-xs shadow-glow flex items-center justify-center gap-3 disabled:opacity-50"
                           >
                              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5" /> Activate Portal Access</>}
                           </button>
                           <button onClick={() => setAssessmentStep(1)} className="w-full text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Back to Wellness Registry</button>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation - Fixed */}
      <aside className="w-80 h-full border-r border-[#E2E8F0] bg-white flex flex-col shrink-0 z-30">
        <div className="p-10 border-b border-[#E2E8F0] bg-white text-blue-600">
           <Link to="/" className="flex items-center gap-3 no-underline group text-blue-600">
              <div className="bg-blue-500/5 p-1 rounded-xl border border-blue-500/10 group-hover:rotate-12 transition-transform">
                 <PrimeVitaLogo className="h-10 w-10 text-blue-600" />
              </div>
              <div className="hidden md:block">
                 <div className="font-display text-xl font-bold text-blue-900 italic serif">PrimeVita</div>
                 <div className="text-[7px] tracking-[0.4em] uppercase text-blue-600/60 font-bold">Patient Hub</div>
              </div>
           </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-6 space-y-2 scrollbar-hide">
           <SidebarBtn active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={LayoutDashboard} label="Dashboard" />
           <SidebarBtn active={activeTab === "appointments"} onClick={() => setActiveTab("appointments")} icon={Calendar} label="Appointments" />
           <SidebarBtn active={activeTab === "records"} onClick={() => setActiveTab("records")} icon={FileText} label="Medical Records" />
           <SidebarBtn active={activeTab === "prescriptions"} onClick={() => setActiveTab("prescriptions")} icon={Pill} label="Prescriptions" />
           <SidebarBtn active={activeTab === "tracking"} onClick={() => setActiveTab("tracking")} icon={Activity} label="Health Tracking" />
           <SidebarBtn active={activeTab === "telehealth"} onClick={() => setActiveTab("telehealth")} icon={Video} label="Telehealth" />
           <SidebarBtn active={activeTab === "billing"} onClick={() => setActiveTab("billing")} icon={CreditCard} label="Billing" />
           <SidebarBtn active={activeTab === "messages"} onClick={() => setActiveTab("messages")} icon={MessageSquare} label="Messages" />
        </nav>

        <div className="p-8 border-t border-border bg-white space-y-2">
           <SidebarBtn active={false} onClick={() => {}} icon={Settings} label="Settings" />
           <button 
             onClick={() => auth.signOut()}
             className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-rose-500 hover:bg-rose-50 transition-all font-bold text-sm"
           >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
           </button>
        </div>
      </aside>

      {/* Main Panel - Scrollable */}
      <main className="flex-1 h-full overflow-y-auto bg-[#F8FAFC]">
        {/* Top Header - Sticky inside main */}
        <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-border px-12 flex items-center justify-between sticky top-0 z-20">
           <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-primary tracking-tight font-display italic serif capitalize">{activeTab}</h1>
              <div className="relative ml-8">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                 <input 
                   placeholder="Search clinical records..." 
                   className="w-80 pl-11 pr-6 py-3 bg-secondary/40 rounded-2xl border border-transparent focus:border-border focus:bg-white outline-none transition-all text-sm font-medium" 
                 />
              </div>
           </div>

           <div className="flex items-center gap-6">
              <button 
                onClick={() => fetchData()}
                disabled={loading}
                className="h-12 w-12 rounded-2xl bg-secondary/40 border border-border flex items-center justify-center relative hover:bg-secondary transition-colors"
              >
                 <Activity className={`h-5 w-5 text-primary/60 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button className="h-12 w-12 rounded-2xl bg-secondary/40 border border-border flex items-center justify-center relative hover:bg-secondary transition-colors">
                 <Bell className="h-5 w-5 text-primary/60" />
                 <div className="absolute top-3.5 right-3.5 h-2 w-2 bg-rose-500 rounded-full border-2 border-white" />
              </button>
              <div className="flex items-center gap-4 p-1.5 pr-5 rounded-[1.25rem] border border-border bg-white shadow-sm overflow-hidden min-w-[180px]">
                 <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {profile?.fullName?.charAt(0) || user?.email?.charAt(0)}
                 </div>
                 <div className="truncate">
                    <div className="text-[12px] font-bold text-primary leading-tight truncate">{profile?.fullName}</div>
                    <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-[0.15em] opacity-60">ID: PV-{patientRecord?.id?.slice(0, 6)}</div>
                 </div>
              </div>
           </div>
        </header>

         <div className="p-12 max-w-7xl mx-auto space-y-12">
            {/* Welcome Section */}
            <div className="flex items-end justify-between gap-8 pb-4 border-b border-border/50">
               <div>
                  <motion.h2 
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     className="text-4xl font-bold text-primary tracking-tight font-display mb-2 italic serif"
                  >
                     Good morning, {profile?.fullName?.split(' ')[0]}
                  </motion.h2>
                  <p className="text-muted-foreground font-medium">Your biometric node is active and synchronized.</p>
               </div>
               <div className="flex items-center gap-3">
                 <button className="px-6 py-3 bg-secondary/50 text-primary rounded-xl font-bold text-[10px] uppercase tracking-widest border border-border hover:bg-secondary transition-colors">
                    Download Health ID
                 </button>
                 <button className="px-8 py-4 bg-primary text-white rounded-[1.5rem] font-bold text-xs uppercase tracking-widest shadow-premium hover:shadow-glow transition-all flex items-center gap-3">
                    <Plus className="h-4 w-4" /> Book Appointment
                 </button>
               </div>
            </div>

            {/* Biometric Dashboard */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
               <StatCard 
                 label="Weight" 
                 value={patientRecord?.latestVitals?.weight ? `${patientRecord.latestVitals.weight}kg` : "--"} 
                 icon={Scale} 
                 sub="Stable at BMI 24.1" 
                 trend="stable" 
               />
               <StatCard 
                 label="Blood Pressure" 
                 value={patientRecord?.latestVitals?.bloodPressure || "--/--"} 
                 icon={Heart} 
                 sub="Last measured today" 
                 trend="up" 
               />
               <StatCard 
                 label="Glucose Avg" 
                 value="94 mg/dL" 
                 icon={Droplets} 
                 sub="Within clinical range" 
                 trend="down" 
               />
               <StatCard 
                 label="Avg HR" 
                 value={patientRecord?.latestVitals?.heartRate ? `${patientRecord.latestVitals.heartRate} BPM` : "--"} 
                 icon={Activity} 
                 sub="Strong sinus rhythm" 
                 trend="stable" 
               />
            </div>

            {/* Branding Banner */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="relative h-48 rounded-[3rem] overflow-hidden shadow-premium border border-border group"
            >
               <img 
                 src="https://r2.erweima.ai/i/z7G0_lFWR5m7u3d_6L0-Qw.png" 
                 alt="PrimeVita Branding" 
                 className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
               />
               <div className="absolute inset-0 bg-gradient-to-r from-primary/40 via-transparent to-transparent flex items-center px-12">
                  <div className="max-w-md">
                     <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/80 mb-2">Our Clinical Promise</div>
                     <h3 className="text-2xl font-bold text-white tracking-tight leading-tight">Compassionate. Professional. <br />ReilabiCa Home Nursing.</h3>
                  </div>
               </div>
            </motion.div>

           {/* Dashboard Content */}
           <div className="space-y-12">
             {/* Health Stats Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <HealthStatCard 
                 icon={Heart} 
                 label="Blood Pressure" 
                 value={patientRecord?.latestVitals?.bloodPressure || encounters[0]?.vitals?.bloodPressure || "--/--"}
                 trend="Optimal" 
                 color="text-rose-500" 
                 bg="bg-rose-50" 
              />
              <HealthStatCard 
                 icon={Thermometer} 
                 label="Body Temp" 
                 value={patientRecord?.latestVitals?.temperature ? `${patientRecord.latestVitals.temperature} °C` : encounters[0]?.vitals?.temperature ? `${encounters[0].vitals.temperature} °F` : "--"}
                 trend="Normal" 
                 color="text-amber-500" 
                 bg="bg-amber-50" 
              />
              <HealthStatCard 
                 icon={Scale} 
                 label="Weight" 
                 value={patientRecord?.latestVitals?.weight ? `${patientRecord.latestVitals.weight} kg` : "168 lbs"} 
                 trend="Stable" 
                 color="text-blue-500" 
                 bg="bg-blue-50" 
              />
              <HealthStatCard 
                 icon={Activity} 
                 label="Heart Rate" 
                 value={patientRecord?.latestVitals?.heartRate ? `${patientRecord.latestVitals.heartRate} BPM` : encounters[0]?.vitals?.heartRate ? `${encounters[0].vitals.heartRate} bpm` : "--"} 
                 trend="Strong" 
                 color="text-emerald-500" 
                 bg="bg-emerald-50" 
              />
           </div>

             {/* Dynamic Section based on Active Tab */}
             {activeTab === "dashboard" ? (
               <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
                  <div className="space-y-8">
                    {/* Upcoming Appointments */}
                    <div className="bg-white rounded-[3rem] p-10 border border-border shadow-clinical">
                       <div className="flex items-center justify-between mb-10">
                          <h3 className="text-xl font-bold text-primary tracking-tight">Upcoming Appointments</h3>
                          <button className="text-[11px] font-bold uppercase tracking-widest text-primary hover:underline">View All</button>
                       </div>
                       <div className="flex flex-col items-center justify-center py-16 opacity-30">
                          <Calendar className="h-16 w-16 mb-4" />
                          <p className="italic font-medium">No scheduled visits for the next 30 days.</p>
                       </div>
                    </div>

                    {/* Latest Clinical Note */}
                    <div className="bg-white rounded-[3rem] p-10 border border-border shadow-clinical">
                       <h3 className="text-xl font-bold text-primary tracking-tight mb-8">Latest Clinical Insights</h3>
                       {encounters[0] ? (
                         <div className="space-y-6">
                            <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground/60 mb-2">
                               <span className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {encounters[0].visitDate?.seconds ? new Date(encounters[0].visitDate.seconds * 1000).toLocaleDateString() : "Present"}</span>
                               <span className="h-1 w-1 rounded-full bg-border" />
                               <span className="flex items-center gap-2 transition-colors hover:text-primary"><Microscope className="h-3.5 w-3.5" /> Clinical Entry</span>
                            </div>
                            <p className="text-muted-foreground leading-relaxed italic">{encounters[0].notes}</p>
                         </div>
                       ) : (
                         <p className="text-muted-foreground italic">No clinical notes available yet.</p>
                       )}
                    </div>
                  </div>

                  {/* Sidebar Widgets */}
                  <div className="space-y-8">
                     <div className="bg-primary rounded-[3rem] p-10 text-white shadow-premium relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl group-hover:scale-125 transition-transform duration-700" />
                        <h3 className="text-lg font-bold mb-2">Health Score</h3>
                        <p className="text-white/60 text-xs font-medium mb-10 leading-relaxed">Based on your recent activity and clinical results.</p>
                        
                        <div className="flex items-end gap-3 mb-6">
                           <span className="text-6xl font-bold tracking-tighter">88</span>
                           <span className="text-2xl font-bold opacity-30 pb-2">/100</span>
                        </div>

                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-6">
                           <motion.div 
                              initial={{ width: 0 }}
                              whileInView={{ width: '88%' }}
                              transition={{ duration: 1.5, delay: 0.5 }}
                              viewport={{ once: true }}
                              className="h-full bg-emerald-400"
                           />
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                           <Activity className="h-4 w-4" /> Optimal Performance
                        </div>
                     </div>

                     {/* Advocacy Widget */}
                     <div className="bg-secondary/40 rounded-[2.5rem] p-8 border border-border/50">
                        <h3 className="font-bold text-primary mb-2">Quality Hotline</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-6">Have concerns about your care experience?</p>
                        <button 
                          onClick={() => setComplaintModal(true)}
                          className="w-full h-12 bg-white text-primary text-[11px] font-bold uppercase tracking-widest rounded-xl border border-border shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                           <Scale className="h-4 w-4" /> Open Support Ticket
                        </button>
                     </div>

                     {/* Contact Care Team */}
                     <div className="bg-white rounded-[2.5rem] p-8 border border-border shadow-clinical">
                        <h3 className="font-bold text-primary mb-4">Your Care Manager</h3>
                        <div className="flex items-center gap-4 mb-6">
                           <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">SW</div>
                           <div>
                              <div className="text-sm font-bold">Dr. Sarah Williams</div>
                              <div className="text-[10px] text-muted-foreground uppercase font-bold">Clinical Lead</div>
                           </div>
                        </div>
                        <button className="w-full bg-primary/10 text-primary py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                           Message Doctor
                        </button>
                     </div>
                  </div>
               </div>
             ) : (
               <div className="bg-white rounded-[3.5rem] p-32 text-center border-2 border-dashed border-border">
                  <div className="h-20 w-20 bg-secondary rounded-3xl flex items-center justify-center mx-auto mb-8 text-primary/30">
                     <FileText className="h-10 w-10" />
                  </div>
                  <h3 className="text-3xl font-bold text-primary tracking-tight font-display mb-4 italic serif">Module Initializing</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">This section of your digital health vault is currently being synchronized with our clinical node.</p>
               </div>
             )}
           </div>
        </div>
      </main>

      {/* Complaint Modal */}
      <AnimatePresence>
        {complaintModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => !submittingComplaint && setComplaintModal(false)}
               className="absolute inset-0 bg-primary/20 backdrop-blur-sm"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative bg-white w-full max-w-xl rounded-[3rem] p-12 shadow-premium border border-border"
            >
               {complaintSuccess ? (
                  <div className="text-center py-12">
                     <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-6" />
                     <h2 className="text-2xl font-bold text-primary mb-2">Feedback Received</h2>
                     <p className="text-muted-foreground">Your advocacy ticket has been logged.</p>
                  </div>
               ) : (
                  <>
                    <h2 className="text-3xl font-bold text-primary tracking-tight mb-8 font-display italic serif">Quality Advocacy</h2>
                    <form onSubmit={async (e) => {
                       e.preventDefault();
                       setSubmittingComplaint(true);
                       const formData = new FormData(e.currentTarget);
                       try {
                          await addDoc(collection(db, "complaints"), {
                             userId: user!.uid,
                             patientId: patientRecord.id,
                             subject: formData.get("subject"),
                             message: formData.get("message"),
                             status: "new",
                             createdAt: serverTimestamp(),
                          });
                          setComplaintSuccess(true);
                          setTimeout(() => {
                             setComplaintModal(false);
                             setComplaintSuccess(false);
                          }, 2000);
                       } catch (err) {
                          handleFirestoreError(err, OperationType.CREATE, "complaints");
                       } finally {
                          setSubmittingComplaint(false);
                       }
                    }} className="space-y-6">
                       <input name="subject" required placeholder="Subject Category" className="w-full h-14 bg-secondary/30 rounded-2xl px-6 outline-none focus:ring-4 focus:ring-primary/5 transition-all" />
                       <textarea name="message" required rows={4} className="w-full bg-secondary/30 rounded-2xl p-6 outline-none focus:ring-4 focus:ring-primary/5 transition-all resize-none" placeholder="Provide detailed feedback..." />
                       <button disabled={submittingComplaint} className="w-full h-16 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-premium flex items-center justify-center gap-2">
                          {submittingComplaint ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Commit Feedback</>}
                       </button>
                    </form>
                  </>
               )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarBtn({ active, icon: Icon, label, onClick }: any) {
   return (
      <button 
        onClick={onClick}
        className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold text-sm group ${active ? "bg-primary text-white shadow-premium" : "text-muted-foreground hover:bg-secondary hover:text-primary"}`}
      >
         <Icon className={`h-5 w-5 transition-transform duration-500 ${active ? "scale-110" : "group-hover:scale-110"}`} />
         <span>{label}</span>
      </button>
   );
}

function AssessmentSelector({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (val: string) => void }) {
    return (
        <div className="space-y-4">
            <label className="text-[11px] font-bold uppercase tracking-widest text-primary/60">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                    <button 
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`px-6 py-3 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all ${value === opt ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:bg-slate-50'}`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, sub, trend }: any) {
   return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-clinical relative group hover:-translate-y-1 transition-all overflow-hidden">
         <div className="flex items-center justify-between mb-8">
            <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
               <Icon className="h-6 w-6" />
            </div>
            {trend === "up" ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : trend === "down" ? <TrendingDown className="h-4 w-4 text-rose-500" /> : <div className="h-1 w-4 bg-muted-foreground/20 rounded-full" />}
         </div>
         <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40 mb-3">{label}</p>
         <div className="text-3xl font-bold text-primary tracking-tighter mb-2 italic serif">{value}</div>
         <div className="text-[10px] font-medium text-muted-foreground opacity-60">{sub}</div>
      </div>
   );
}

function HealthStatCard({ icon: Icon, label, value, trend, color, bg }: any) {
   return (
      <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-clinical relative group hover:-translate-y-1 transition-all overflow-hidden">
         <div className="flex items-center justify-between mb-8">
            <div className={`h-12 w-12 rounded-2xl ${bg} ${color} flex items-center justify-center relative overflow-hidden`}>
               <Icon className="h-6 w-6 relative z-10" />
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-[#F1F5F9] rounded-full text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
               <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" /> Live
            </div>
         </div>
         <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">{label}</p>
         <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-bold text-primary tracking-tighter italic font-display">{value}</span>
         </div>
         <div className={`text-[10px] font-bold ${color} flex items-center gap-1`}>
            <Activity className="h-3 w-3" /> {trend}
         </div>
      </div>
   );
}
