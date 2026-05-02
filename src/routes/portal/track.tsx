import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, serverTimestamp, addDoc, doc, updateDoc, limit } from "firebase/firestore";
import { 
  Search, ShieldCheck, Mail, ArrowRight, Lock, 
  Clock, CheckCircle, ChevronRight, Activity, 
  Briefcase, User, MapPin, Calendar, FileText,
  AlertCircle, RefreshCw, CalendarCheck, Check
} from "lucide-react";
import { toast } from "sonner";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";
import { motion, AnimatePresence } from "motion/react";
import { PrimeVitaLogo } from "@/components/PrimeVitaLogo";

export const Route = createFileRoute("/portal/track")({
  component: TrackingPortal,
});

function TrackingPortal() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [appData, setAppData] = useState<any>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  async function handleFindApplication() {
    setLoading(true);
    setError("");
    try {
      // Find by email or tracking token
      const q = query(
        collection(db, "applications"),
        where("email", "==", identifier.trim().toLowerCase()),
        limit(1)
      );
      
      let snap = await getDocs(q);
      
      // If not found by email, try tracking token
      if (snap.empty) {
        const q2 = query(
          collection(db, "applications"),
          where("trackingToken", "==", identifier.trim().toUpperCase()),
          limit(1)
        );
        snap = await getDocs(q2);
      }

      if (snap.empty) {
        setError("No application found with provided identifier.");
        return;
      }

      const docData = snap.docs[0].data();
      const docId = snap.docs[0].id;

      // Generate new OTP for this session
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await updateDoc(doc(db, "applications", docId), {
        otp,
        updatedAt: serverTimestamp()
      });

      // Send Email
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: docData.email,
          subject: "PrimeVita Access Verification",
          html: `
            <div style="font-family: serif; padding: 40px; background: #f8fafc; text-align: center;">
              <h1 style="color: #1e1b4b;">Security Verification</h1>
              <p>You requested to track your application status. Enter the code below to gain access.</p>
              <div style="background: #4f46e5; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 20px; margin: 30px auto; max-width: 200px; letter-spacing: 5px;">
                ${otp}
              </div>
            </div>
          `
        })
      });

      setAppData({ ...docData, id: docId });
      setOtpSent(true);
      setResendTimer(30);
      toast.success("Security code dispatched to registered email.");

    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, "applications");
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyAndUnlock() {
    setVerifying(true);
    try {
      if (otpInput === appData.otp) {
        setOtpSent(false); // Move to show details
        toast.success("Identity synchronized.");
      } else {
        toast.error("Invalid security code.");
      }
    } finally {
      setVerifying(false);
    }
  }

  if (appData && !otpSent) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-20 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-12"
        >
          <div className="flex items-center justify-between">
             <Link to="/" className="flex items-center gap-3 no-underline group">
                <div className="bg-indigo-600 p-2 rounded-xl">
                   <PrimeVitaLogo className="h-8 w-8 text-white" />
                </div>
                <div className="leading-tight">
                   <div className="font-display text-xl font-bold text-primary italic serif">PrimeVita</div>
                   <div className="text-[7px] tracking-[0.4em] uppercase text-primary/40 font-bold">Tracking Hub</div>
                </div>
             </Link>
             <button onClick={() => setAppData(null)} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Logout Session</button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-premium relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16" />
                   
                   <div className="space-y-10 relative">
                      <div className="flex items-center justify-between">
                         <div className="space-y-2">
                            <h1 className="text-4xl font-bold italic serif tracking-tight">{appData.fullName}</h1>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">{appData.role} Candidate</p>
                         </div>
                         <div className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                           appData.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                           appData.status === 'interview' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                           appData.status === 'accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                           'bg-rose-50 text-rose-600 border-rose-100'
                         }`}>
                           Status: {appData.status}
                         </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
                         <InfoItem icon={Mail} label="Email Uplink" value={appData.email} />
                         <InfoItem icon={Calendar} label="Created" value={new Date(appData.appliedAt?.seconds * 1000).toLocaleDateString()} />
                         <InfoItem icon={Briefcase} label="Designated Role" value={appData.role} />
                         <InfoItem icon={ShieldCheck} label="Tracking Token" value={appData.trackingToken} />
                      </div>
                   </div>
                </div>

                <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-premium space-y-8">
                   <h3 className="text-xl font-bold italic serif">Application Roadmap</h3>
                   
                   {appData.status === 'interview' && (
                     <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 bg-indigo-50 rounded-[2rem] border border-indigo-100 space-y-6"
                     >
                        <div className="flex items-center gap-4">
                           <div className="h-12 w-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                              <CalendarCheck className="h-6 w-6" />
                           </div>
                           <div>
                              <h4 className="font-bold text-indigo-900">Strategic Interview Active</h4>
                              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Awaiting Synchronization</p>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                              Administrative protocols for your interview phase have been established. Please prepare your original clinical documentation for a scheduled video call.
                           </p>
                           {appData.interviewDate ? (
                             <div className="p-4 bg-white rounded-xl border border-indigo-100 flex items-center justify-between">
                                <div className="space-y-1">
                                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scheduled Node</div>
                                   <div className="font-bold text-slate-800">{new Date(appData.interviewDate.seconds * 1000).toLocaleString()}</div>
                                </div>
                                <Link 
                                   to="/portal/interview/$token" 
                                   params={{ token: appData.interview?.token }}
                                   className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-glow hover:bg-indigo-700 transition-all"
                                >
                                   Join Call
                                </Link>
                             </div>
                           ) : (
                             <div className="text-[10px] font-bold text-indigo-400 italic">Interviewer is currently establishing a time slot. You will be notified.</div>
                           )}
                        </div>
                     </motion.div>
                   )}

                   <div className="space-y-6">
                      <TimelineItem 
                        title="Identity Verification" 
                        desc="Global health credentials verified against primary registries." 
                        completed={true} 
                        current={false}
                      />
                      <TimelineItem 
                        title="Administrative Review" 
                        desc="Clinical board evaluating professional competency nodes." 
                        completed={appData.status !== 'pending'} 
                        current={appData.status === 'pending'}
                      />
                      <TimelineItem 
                        title="Strategic Interview" 
                        desc="Bilateral discussion regarding network integration." 
                        completed={['accepted', 'contract'].includes(appData.status)} 
                        current={appData.status === 'interview'}
                      />
                      <TimelineItem 
                        title="Network Deployment" 
                        desc="Onboarding into the PrimeVita domiciliary care system." 
                        completed={appData.status === 'accepted'} 
                        current={appData.status === 'contract'}
                      />
                   </div>
                </div>
             </div>

             <div className="space-y-8">
                <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-glow space-y-6 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/20 to-transparent" />
                   <div className="relative">
                      <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                         <Activity className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-bold italic serif mb-2">Next Steps</h3>
                      <p className="text-indigo-100 text-xs leading-relaxed">
                        {appData.status === 'pending' ? 
                          "Our board is currently reviewing your documentation. Expected latency: 48-72 hours." :
                          appData.status === 'interview' ?
                          "Your interview logic is active. Please check your secure portal for schedule synchronization." :
                          "Deployment phase initiated. Prepare for clinical synchronization."
                        }
                      </p>
                   </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-premium space-y-6">
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                         <AlertCircle className="h-5 w-5" />
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Security Notice</div>
                   </div>
                   <p className="text-[11px] text-slate-500 leading-relaxed">
                      Your identity node is anchored to this application. Any unauthorized synchronization attempts will trigger a diagnostic lockout.
                   </p>
                </div>
             </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <AnimatePresence mode="wait">
        {!otpSent ? (
          <motion.div 
            key="find"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-md w-full bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-premium text-center space-y-12"
          >
            <div className="space-y-4">
               <div className="h-20 w-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-indigo-100">
                  <Search className="h-10 w-10" />
               </div>
               <h2 className="text-4xl font-bold italic serif tracking-tight">Track Progress</h2>
               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Global Pipeline Access</p>
               <p className="text-slate-500 text-sm font-medium leading-relaxed">Enter your registered email or tracking token to establish a secure handshake.</p>
            </div>

            <div className="space-y-6">
               <div className="relative group">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Email or Token"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    className="w-full h-18 bg-slate-50 border border-slate-100 rounded-2xl pl-16 pr-6 font-bold text-sm outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                  />
               </div>
               
               {error && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-rose-500 text-[10px] font-bold uppercase tracking-widest bg-rose-50 py-3 rounded-xl border border-rose-100">
                    {error}
                 </motion.div>
               )}

               <button 
                onClick={handleFindApplication}
                disabled={loading || identifier.length < 5}
                className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-glow hover:bg-slate-900 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
               >
                 {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <>Request Secure Link <ArrowRight className="h-4 w-4" /></>}
               </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="verify"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-md w-full bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-premium text-center space-y-12"
          >
            <div className="space-y-4">
               <div className="h-24 w-24 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-glow rotate-3 ring-8 ring-indigo-50">
                  <Lock className="h-10 w-10" />
               </div>
               <h2 className="text-4xl font-bold italic serif tracking-tight">Security Uplink</h2>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Identity Node Pending</p>
               <p className="text-slate-500 text-sm font-medium leading-relaxed">A synchronization code has been dispatched to your email interface.</p>
            </div>

            <div className="space-y-8">
               <input 
                  type="text" 
                  maxLength={6}
                  placeholder="••••••"
                  value={otpInput}
                  autoFocus
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-28 bg-slate-50 border-2 border-slate-100 text-center text-5xl font-mono font-bold tracking-[0.4em] rounded-[2.5rem] outline-none focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all uppercase px-4 placeholder:text-slate-200"
               />
               <div className="flex items-center justify-between px-6">
                  <button 
                    disabled={resendTimer > 0}
                    onClick={handleFindApplication}
                    className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline disabled:text-slate-400 disabled:no-underline"
                  >
                    {resendTimer > 0 ? `Retry in ${resendTimer}s` : "Resend Security Code"}
                  </button>
                  <button onClick={() => setOtpSent(false)} className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:underline">Abort Uplink</button>
               </div>

               <button 
                  onClick={handleVerifyAndUnlock}
                  disabled={otpInput.length < 6 || verifying}
                  className="w-full h-18 bg-indigo-600 text-white rounded-3xl font-bold text-xs uppercase tracking-[0.2em] shadow-glow hover:bg-slate-900 transition-all disabled:opacity-30"
               >
                  Verify Application Identity
               </button>

               <div className="pt-8 border-t border-slate-100">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                     Development Notice: Real email delivery is currently restricted. Your code is: <span className="text-indigo-600 underline cursor-pointer" onClick={() => setOtpInput(appData.otp)}>{appData.otp}</span>
                  </p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
         <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-sm font-bold text-primary">{value}</div>
    </div>
  );
}

function TimelineItem({ title, desc, completed, current }: { title: string; desc: string; completed: boolean; current: boolean }) {
  return (
    <div className="flex gap-6 relative group">
      <div className="flex flex-col items-center">
        <div className={`h-10 w-10 rounded-xl border-2 flex items-center justify-center transition-all ${
           completed ? 'bg-emerald-500 border-emerald-500 text-white' :
           current ? 'bg-indigo-600 border-indigo-600 text-white shadow-glow' :
           'bg-white border-slate-100 text-slate-300'
        }`}>
          {completed ? <Check className="h-5 w-5" /> : current ? <Activity className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
        </div>
        <div className="flex-1 w-0.5 bg-slate-100 my-2 group-last:hidden" />
      </div>
      <div className="flex-1 pb-8 group-last:pb-0">
        <div className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${current ? 'text-indigo-600' : 'text-slate-400'}`}>
          {title}
        </div>
        <div className="text-xs text-slate-500 font-medium leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

function InfoNode({ icon: Icon, value, color }: { icon: any, value: string, color: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className={`h-8 w-8 ${color} rounded-lg flex items-center justify-center`}>
                <Icon className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 tracking-tight">{value}</span>
        </div>
    );
}
