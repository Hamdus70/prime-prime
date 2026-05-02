import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ShieldCheck, Mail, Loader2, ArrowRight, Lock, Key, Smartphone, CheckCircle, AlertCircle, Copy, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";
import { PrimeVitaLogo } from "@/components/PrimeVitaLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/recovery")({
  component: RecoveryPortal,
});

type RecoveryStep = "request" | "otp" | "mode" | "result";

async function hashPassword(password: string) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function RecoveryPortal() {
  const [step, setStep] = useState<RecoveryStep>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [mode, setMode] = useState<"username" | "password">("username");
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const q = query(collection(db, "user_profiles"), where("email", "==", email));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("No biological node found matching this email.");
      
      const user = snap.docs[0].data();
      setUserData(user);
      
      // Simulate OTP generation
      const simulatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await setDoc(doc(db, "recovery_codes", email), {
        email,
        code: simulatedOtp,
        expiresAt: new Date(Date.now() + 10 * 60000), // 10 mins
        createdAt: serverTimestamp()
      });
      
      toast.success(`Security code transmitted to ${email}. (DEBUG: ${simulatedOtp})`);
      setStep("otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const snap = await getDocs(query(collection(db, "recovery_codes"), where("email", "==", email)));
      if (snap.empty) throw new Error("No active recovery session found.");
      
      const session = snap.docs[0].data();
      if (session.code !== otp) throw new Error("Invalid security code.");
      
      setStep("mode");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const passwordHash = await hashPassword(newPassword);
      await updateDoc(doc(db, "credentials", userData.username), {
        passwordHash,
        updatedAt: serverTimestamp()
      });
      toast.success("Security cipher successfully rotated.");
      setStep("result");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 selection:bg-primary/10">
      <div className="max-w-xl w-full">
        <Link to="/portal/auth" className="flex items-center gap-3 mb-12 no-underline group justify-center">
            <div className="bg-primary/5 p-2 rounded-2xl border border-primary/10 group-hover:rotate-12 transition-transform">
               <PrimeVitaLogo className="h-10 w-10" />
            </div>
            <div className="flex flex-col leading-none text-left">
              <span className="font-bold text-2xl tracking-tighter italic serif text-primary">PrimeVita</span>
              <span className="text-[8px] uppercase tracking-[0.3em] font-bold text-muted-foreground">Identity Recovery</span>
            </div>
        </Link>

        <motion.div 
          layout
          className="bg-white rounded-[3.5rem] p-12 border border-border shadow-clinical relative overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {step === "request" && (
              <motion.div 
                key="request"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <div className="h-16 w-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mx-auto">
                    <ShieldCheck className="h-8 w-8" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight italic serif">Request Identity Access</h2>
                  <p className="text-muted-foreground font-medium max-w-sm mx-auto">Enter your verified email node to initiate biometric recovery.</p>
                </div>

                <form onSubmit={handleRequest} className="space-y-6">
                  <RecoveryInput label="Biological Email Node" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@primevita.com" icon={Mail} required />
                  <button type="submit" disabled={loading} className="w-full h-16 bg-primary text-white rounded-3xl font-bold text-xs uppercase tracking-widest shadow-premium disabled:opacity-50 flex items-center justify-center gap-3">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Transmit Security Code <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
              </motion.div>
            )}

            {step === "otp" && (
              <motion.div 
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto">
                    <Smartphone className="h-8 w-8" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight italic serif">Verify Transmitted Code</h2>
                  <p className="text-muted-foreground font-medium max-w-sm mx-auto">A 6-digit cryptographic token has been sent to {email}.</p>
                </div>

                <form onSubmit={handleVerify} className="space-y-6">
                  <RecoveryInput label="Security Token" type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="000000" icon={Key} required />
                  <button type="submit" disabled={loading} className="w-full h-16 bg-primary text-white rounded-3xl font-bold text-xs uppercase tracking-widest shadow-premium disabled:opacity-50 flex items-center justify-center gap-3">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Authorize Access <ShieldCheck className="h-4 w-4" /></>}
                  </button>
                  <button type="button" onClick={() => setStep("request")} className="w-full text-xs font-bold text-muted-foreground/60 uppercase tracking-widest hover:text-primary">Cancel Transaction</button>
                </form>
              </motion.div>
            )}

            {step === "mode" && (
              <motion.div 
                key="mode"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="text-center space-y-4">
                  <h2 className="text-3xl font-bold tracking-tight italic serif">Select Recovery Protocol</h2>
                  <p className="text-muted-foreground font-medium">Verified Identity: <span className="text-primary font-bold">{userData?.fullName}</span></p>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={() => setMode("username")}
                        className={`flex-1 p-6 rounded-3xl border-2 transition-all text-left space-y-3 ${mode === "username" ? "border-primary bg-primary/5" : "border-border hover:bg-slate-50"}`}
                    >
                        <UserCircle className={mode === "username" ? "text-primary" : "text-muted-foreground"} />
                        <div className="font-bold text-sm">Reveal System ID</div>
                        <div className="text-[10px] text-muted-foreground leading-relaxed">Decrypt and display your clinical username.</div>
                    </button>
                    <button 
                        onClick={() => setMode("password")}
                        className={`flex-1 p-6 rounded-3xl border-2 transition-all text-left space-y-3 ${mode === "password" ? "border-primary bg-primary/5" : "border-border hover:bg-slate-50"}`}
                    >
                        <RotateCcw className={mode === "password" ? "text-primary" : "text-muted-foreground"} />
                        <div className="font-bold text-sm">Rotate Cipher</div>
                        <div className="text-[10px] text-muted-foreground leading-relaxed">Establish a new security password.</div>
                    </button>
                </div>

                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <AnimatePresence mode="wait">
                        {mode === "username" ? (
                            <motion.div key="mode-user" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your Clinical System Username</label>
                                <div className="text-2xl font-bold text-primary italic serif flex items-center justify-between">
                                    {userData?.username}
                                    <button onClick={() => { navigator.clipboard.writeText(userData?.username); toast.success("Copied"); }} className="p-2 hover:bg-primary/10 rounded-xl transition-colors">
                                        <Copy className="h-5 w-5" />
                                    </button>
                                </div>
                                <button onClick={() => setStep("result")} className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest">Acknowledge & Finish</button>
                            </motion.div>
                        ) : (
                            <motion.div key="mode-pass" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                <form onSubmit={handleReset} className="space-y-6">
                                    <RecoveryInput label="New Security Cipher" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" icon={Lock} required />
                                    <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-premium">
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Confirm New Cipher"}
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
              </motion.div>
            )}

            {step === "result" && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-10"
              >
                <div className="h-24 w-24 bg-emerald-50 text-emerald-600 rounded-[2.5rem] border border-emerald-100 flex items-center justify-center mx-auto shadow-soft">
                  <CheckCircle className="h-12 w-12" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold tracking-tight italic serif">Access Restored</h2>
                  <p className="text-muted-foreground font-medium max-w-sm mx-auto">Your identity node has been re-synchronized. You may now return to the authentication gateway.</p>
                </div>
                <button 
                  onClick={() => navigate({ to: "/portal/auth" })}
                  className="w-full h-16 bg-primary text-white rounded-3xl font-bold text-xs uppercase tracking-widest shadow-premium hover:shadow-glow transition-all"
                >
                  Return to Gateway
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-rose-500 mt-0.5" />
              <p className="text-[13px] font-bold text-rose-600 leading-tight">{error}</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function RecoveryInput({ label, icon: Icon, ...props }: any) {
    return (
       <div className="space-y-2 group text-left">
         <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 transition-colors group-focus-within:text-primary">{label}</label>
         <div className="relative">
            <Icon className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary/60 transition-colors" />
            <input 
               {...props}
               className="w-full h-14 pl-12 pr-6 rounded-2xl border border-border bg-secondary/30 text-sm font-semibold focus:ring-4 focus:ring-primary/5 focus:border-primary/40 outline-none transition-all placeholder:font-normal placeholder:opacity-40" 
            />
         </div>
       </div>
    );
 }

function UserCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
    </svg>
  );
}
