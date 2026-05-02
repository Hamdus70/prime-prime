import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ShieldCheck, Mail, Loader2, ArrowRight, Lock, UserCircle, Globe, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";
import { PrimeVitaLogo } from "@/components/PrimeVitaLogo";

export const Route = createFileRoute("/portal/auth")({
  component: AuthPage,
});

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const search = useSearch({ from: "/portal/auth" }) as { redirect?: string };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS' && event.data.customToken) {
        setLoading(true);
        try {
          const result = await signInWithCustomToken(auth, event.data.customToken);
          await ensureUserProfile(result.user);
          navigate({ to: search.redirect || "/portal" });
        } catch (err: any) {
          setError("Session synchronization failed: " + err.message);
          setLoading(false);
        }
      } else if (event.data?.type === 'GOOGLE_AUTH_FAILURE') {
        setError("Clinical SSO Failure: " + (event.data.error || "Unknown authentication error"));
        setLoading(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [search.redirect]);

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/google/url");
      const { url } = await response.json();
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        url, 
        "google_sso", 
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error("Popup blocked. Please enable popups for clinical SSO.");
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleEmailAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const identifier = formData.get("identifier") as string;
    const password = formData.get("password") as string;

    try {
      if (isLogin) {
        let isSystemLogin = identifier.startsWith("CL-") || identifier.startsWith("HSP-");
        const hash = isSystemLogin ? await hashPassword(password) : password;

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password: hash, isSystemLogin })
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error || "Authentication failed.");

        const { signInWithCustomToken } = await import("firebase/auth");
        await signInWithCustomToken(auth, data.customToken);
      } else {
        const email = formData.get("email") as string;
        const fullName = formData.get("fullName") as string;
        const role = formData.get("role") as string;
        const result = await createUserWithEmailAndPassword(auth, email, password);
        
        await updateProfile(result.user, { displayName: fullName });

        const profileData = {
          userId: result.user.uid,
          email,
          fullName,
          role,
          createdAt: serverTimestamp(),
        };

        await setDoc(doc(db, "user_profiles", result.user.uid), profileData);

        // Create application record for admin visibility
        await setDoc(doc(db, "applications", result.user.uid), {
          fullName,
          email,
          role,
          type: role,
          status: "pending",
          appliedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          userId: result.user.uid,
          source: "direct_registration"
        });
      }
      navigate({ to: search.redirect || "/portal" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Define hashPassword helper inside or outside the component
  async function hashPassword(password: string) {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function ensureUserProfile(user: any) {
    const docRef = doc(db, "user_profiles", user.uid);
    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          userId: user.uid,
          email: user.email,
          fullName: user.displayName || "Authorized User",
          role: "patient", 
          createdAt: serverTimestamp(),
        });

        // Create application record for admin visibility
        await setDoc(doc(db, "applications", user.uid), {
          fullName: user.displayName || "Authorized User",
          email: user.email,
          role: "patient",
          type: "patient",
          status: "pending",
          appliedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          userId: user.uid,
          source: "google_sso"
        });
      }
    } catch (err) {
      // If permission denied here, it might be a connectivity issue or rule issue
      console.warn("Profile sync skipped:", err);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex selection:bg-primary/10 selection:text-primary">
      {/* Left Decoration Column */}
      <div className="hidden lg:flex w-1/2 bg-primary relative overflow-hidden flex-col justify-between p-20">
         <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-white rounded-full blur-[150px]" />
            <div className="absolute bottom-1/4 -right-20 w-[400px] h-[400px] bg-indigo-400 rounded-full blur-[120px]" />
         </div>

         <Link to="/" className="relative flex items-center gap-3 no-underline text-white group">
            <div className="bg-white/10 p-2 rounded-2xl border border-white/20 group-hover:rotate-12 transition-transform shadow-xl backdrop-blur-md">
               <PrimeVitaLogo className="h-10 w-10 brightness-0 invert" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-2xl tracking-tighter italic serif">PrimeVita</span>
              <span className="text-[8px] uppercase tracking-[0.3em] font-bold opacity-60">Security Hub</span>
            </div>
         </Link>

         <div className="relative">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="max-w-md"
            >
               <h2 className="text-5xl font-bold text-white tracking-tight leading-[1.1] font-display italic serif mb-8">
                  The Gold Standard in <br /> <span className="opacity-40">Digital Health Management.</span>
               </h2>
               <div className="space-y-4">
                  <FeatureItem label="Biometric Multi-Factor Encryption" />
                  <FeatureItem label="Direct HL7 Clinical Node Access" />
                  <FeatureItem label="256-bit AES Patient Sovereignty" />
               </div>
            </motion.div>
         </div>

         <div className="relative flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
            <span>Server: PV-ALPHA-01</span>
            <span>Uptime: 99.98%</span>
         </div>
      </div>

      {/* Right Login Column */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-20 py-20 bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.02)] relative">
        <div className="absolute top-10 right-10 flex items-center gap-2 text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">
           <Globe className="h-3.5 w-3.5" /> Clinical Cloud v4.2
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md w-full mx-auto"
        >
          <div className="mb-12">
            <div className="h-14 w-14 bg-secondary rounded-3xl flex items-center justify-center text-primary mb-6 shadow-sm border border-border">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-bold text-primary tracking-tight font-display mb-2">
               {isLogin ? "Session Authentication" : "Integrate Your Account"}
            </h1>
            <p className="text-muted-foreground font-medium leading-relaxed">
               {isLogin ? "Enter your credentials to access your private clinical vault." : "Establish your identity within the PrimeVita network."}
            </p>
          </div>

          <button 
            onClick={handleGoogleLogin} 
            disabled={loading}
            className="w-full h-14 inline-flex items-center justify-center gap-4 rounded-2xl border border-border bg-white text-sm font-bold transition-all hover:bg-slate-50 hover:border-slate-300 hover:shadow-xl active:scale-[0.98] disabled:opacity-50 group font-display"
          >
            <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
               <img src="https://www.google.com/favicon.ico" className="h-5 w-5" alt="Google" />
            </div>
            <span className="text-slate-700">Continue with Google Cloud SSO</span>
          </button>

          <div className="relative my-10 flex items-center gap-4">
            <div className="h-px bg-border flex-1" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Credential Entry</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-6">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  <AuthInput label="Full Medical Name" name="fullName" placeholder="As it appears on ID" icon={UserCircle} required />
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 transition-colors">Portal Permissives</label>
                    <div className="relative">
                       <Activity className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                       <select name="role" className="w-full h-14 pl-12 pr-6 rounded-2xl border border-border bg-secondary/30 text-sm font-semibold focus:ring-4 focus:ring-primary/5 focus:border-primary/40 outline-none transition-all appearance-none">
                         <option value="patient">Authorized Patient / Beneficiary</option>
                         <option value="staff">Credentialed Medical Staff</option>
                       </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!isLogin && (
                <AuthInput label="Network EmailNode" type="email" name="email" placeholder="name@primevita.com" icon={Mail} required />
            )}
            
            {isLogin ? (
                <AuthInput label="System ID / Email" type="text" name="identifier" placeholder="CL-XX-0000 or email" icon={Mail} required />
            ) : null}

            <AuthInput label="Security Cipher" type="password" name="password" placeholder="••••••••" icon={Lock} required />

            {isLogin && (
                <div className="flex justify-end">
                    <Link to="/portal/recovery" className="text-[10px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">Credential Recovery</Link>
                </div>
            )}

            <AnimatePresence>
               {error && (
                 <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3"
                 >
                    <div className="h-4 w-4 rounded-full bg-rose-500 mt-0.5 shrink-0" />
                    <p className="text-[13px] font-bold text-rose-600 leading-tight">{error}</p>
                 </motion.div>
               )}
            </AnimatePresence>

            <button 
               disabled={loading} 
               type="submit" 
               className="w-full h-16 bg-primary text-white rounded-3xl font-bold text-xs uppercase tracking-[0.2em] shadow-premium hover:shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-3 relative overflow-hidden"
            >
              {loading ? (
                 <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                 <>
                   {isLogin ? "Initialize Session" : "Create Clinical Link"}
                   <ArrowRight className="h-4 w-4" />
                 </>
              )}
              {loading && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
            </button>
          </form>

          <div className="mt-10 text-center space-y-4">
            <button 
               onClick={() => setIsLogin(!isLogin)} 
               className="text-xs font-bold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors block w-full text-center"
            >
              {isLogin ? "Request New Network Access" : "Returning authorized user? Sign In"}
            </button>
            <div className="h-px bg-slate-100 max-w-[100px] mx-auto" />
            <Link 
              to="/portal/track" 
              className="text-xs font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-600 transition-colors block no-underline"
            >
              Track Application Progress
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function AuthInput({ label, icon: Icon, ...props }: any) {
   return (
      <div className="space-y-2 group">
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

function FeatureItem({ label }: { label: string }) {
   return (
      <div className="flex items-center gap-3 text-white/70">
         <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
         <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      </div>
   );
}

