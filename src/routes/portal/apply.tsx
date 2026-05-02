import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc, runTransaction, increment, updateDoc } from "firebase/firestore";
import { 
  CheckCircle, Send, Loader2, ShieldCheck, Mail, Phone, Clock, FileText, 
  ChevronRight, Stethoscope, ArrowRight, User, Users, Briefcase, 
  ShieldAlert, Shield, Heart, Activity, MapPin, Calendar, 
  FileCheck, ShieldCheck as ShieldIcon, Landmark, Copy, Check, Lock
} from "lucide-react";
import { toast } from "sonner";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";
import { PrimeVitaLogo } from "@/components/PrimeVitaLogo";
import { motion, AnimatePresence } from "motion/react";

export const Route = createFileRoute("/portal/apply")({
  component: ApplicationPortal,
});

type AppType = "patient" | "staff" | null;

interface FormDataState {
  type: AppType;
  fullName: string;
  email: string;
  phone: string;
  age: string;
  gender: string;
  address: string;
  password?: string;
  // Patient specific
  medicalConditions: string;
  medications: string;
  allergies: string;
  emergencyContacts: Array<{
    fullName: string;
    relationship: string;
    phone: string;
    phoneAlt: string;
    email: string;
    address: string;
    occupation: string;
    idType: string;
    idNumber: string;
  }>;
  paymentMethod: string;
  // Staff specific
  role: string;
  dob: string;
  cvFile: File | null;
  license: {
    type: string;
    file: File | null;
  };
  identity: {
    type: string;
    file: File | null;
  };
  education: {
    school: string;
    qualification: string;
    year: string;
    file: File | null;
  };
  guarantor: {
    fullName: string;
    relationship: string;
    phone: string;
    address: string;
    occupation: string;
    idType: string;
    idFile: File | null;
    refId: string;
  };
  declarationAgreed: boolean;
}

const initialForm: FormDataState = {
  type: null,
  fullName: "",
  email: "",
  phone: "",
  age: "",
  gender: "Male",
  address: "",
  dob: "",
  role: "nurse",
  cvFile: null,
  license: { type: "Professional License", file: null },
  identity: { type: "National ID Card", file: null },
  education: { school: "", qualification: "", year: "", file: null },
  guarantor: {
    fullName: "",
    relationship: "",
    phone: "",
    address: "",
    occupation: "",
    idType: "National ID Card",
    idFile: null,
    refId: ""
  },
  declarationAgreed: false,
  paymentMethod: "Insurance",
  medicalConditions: "",
  medications: "",
  allergies: "",
  emergencyContacts: [{
    fullName: "",
    relationship: "",
    phone: "",
    phoneAlt: "",
    email: "",
    address: "",
    occupation: "",
    idType: "National ID",
    idNumber: ""
  }],
};

// Simple hashing function for demo purposes
async function hashPassword(password: string) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function ApplicationPortal() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormDataState>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedCreds, setGeneratedCreds] = useState<{ username: string; password?: string } | null>(null);
  const [credsSaved, setCredsSaved] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Restore pending app from local storage if exists
    const saved = localStorage.getItem("_pv_pending_app");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Check if it should be expired? (Maybe not needed for simple demo)
            (window as any)._pendingApp = parsed;
            setVerifyingOtp(true);
        } catch (e) {
            localStorage.removeItem("_pv_pending_app");
        }
    }

    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const updateForm = (updates: Partial<FormDataState>) => setForm(f => ({ ...f, ...updates }));

  async function generatePatientUsername(fullName: string) {
    const initials = fullName
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 3);
    
    const counterRef = doc(db, "counters", "patient_id");
    
    let nextId = 1;
    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (counterDoc.exists()) {
        nextId = counterDoc.data().current + 1;
        transaction.update(counterRef, { current: nextId });
      } else {
        transaction.set(counterRef, { current: 1 });
      }
    });

    return `CL-${initials}-${nextId.toString().padStart(4, "0")}`;
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    let currentPath = "applications";
    try {
      if (form.type === 'patient') {
        // ... (existing patient logic)
        currentPath = "counters";
        const username = await generatePatientUsername(form.fullName);
        const tempPassword = Math.random().toString(36).substring(2, 10).toUpperCase();
        const passwordHash = await hashPassword(tempPassword);

        currentPath = "applications";
        const appRef = await addDoc(collection(db, "applications"), {
          ...form,
          id: username,
          status: "pending",
          appliedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        currentPath = "credentials";
        await setDoc(doc(db, "credentials", username), {
          userId: appRef.id,
          username,
          passwordHash,
          role: "patient",
          isTemporary: true,
          createdAt: serverTimestamp()
        });

        currentPath = "user_profiles";
        await setDoc(doc(db, "user_profiles", appRef.id), {
          userId: appRef.id,
          username,
          fullName: form.fullName,
          email: form.email,
          role: "patient",
          createdAt: serverTimestamp()
        });

        currentPath = "patients";
        await setDoc(doc(db, "patients", appRef.id), {
          id: appRef.id,
          name: form.fullName,
          email: form.email,
          phone: form.phone,
          condition: form.medicalConditions,
          medications: form.medications,
          allergies: form.allergies,
          emergencyContacts: form.emergencyContacts,
          billing: { balanceDue: 0, status: 'current' },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Dispatch Welcome Email with Tracking Link
        await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: form.email,
                subject: "Welcome to PrimeVita Health - Your Access Token",
                html: `
                    <div style="font-family: serif; padding: 40px; background: #f8fafc;">
                        <h1 style="color: #1e1b4b;">Onboarding Initiated</h1>
                        <p>Your identity node has been established in the PrimeVita network.</p>
                        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <p><strong>Username:</strong> ${username}</p>
                            <p><strong>Temporary Access Token:</strong> ${tempPassword}</p>
                        </div>
                        <p>Please log in at the <a href="https://ais-pre-3h6gqpkehj6rlw5dh2syqm-321404006371.europe-west1.run.app/portal/auth">Patient Portal</a> to complete your profile.</p>
                    </div>
                `
            })
        });

        setGeneratedCreds({ username, password: tempPassword });
        setSubmitted(true);
      } else {
        // Detailed Staff Submission
        const fileCount = [
            form.cvFile, 
            form.license.file, 
            form.identity.file, 
            form.education.file, 
            form.guarantor.idFile
        ].filter(Boolean).length;

        if (fileCount < 5) {
          setError("Missing required documentation: CV, License, Identity ID, Educational Certificate, and Guarantor ID are mandatory.");
          setLoading(false);
          return;
        }

        const trackingToken = Math.random().toString(36).substring(2, 15).toUpperCase();
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date();
        otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 15);

        currentPath = "applications";
        const appRef = await addDoc(collection(db, "applications"), {
            fullName: form.fullName,
            email: form.email,
            phone: form.phone,
            dob: form.dob,
            address: form.address,
            role: form.role,
            status: "unverified",
            type: "staff",
            cv: { name: form.cvFile?.name, size: form.cvFile?.size, type: form.cvFile?.type },
            license: { type: form.license.type, name: form.license.file?.name, size: form.license.file?.size },
            identity: { type: form.identity.type, name: form.identity.file?.name, size: form.identity.file?.size },
            education: { school: form.education.school, qualification: form.education.qualification, year: form.education.year, name: form.education.file?.name },
            guarantor: { ...form.guarantor, idFile: { name: form.guarantor.idFile?.name } },
            trackingToken,
            otp,
            otpExpiresAt: otpExpiresAt.toISOString(),
            appliedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        const pendingData = { username: form.email, otp, trackingToken, appId: appRef.id };
        (window as any)._pendingApp = pendingData;
        localStorage.setItem("_pv_pending_app", JSON.stringify(pendingData));
        
        // Dispatch OTP Email
        await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: form.email,
                subject: "PrimeVita Security Uplink: Your OTP Code",
                html: `
                    <div style="font-family: serif; padding: 40px; background: #f8fafc; text-align: center;">
                        <h1 style="color: #1e1b4b;">Security Verification</h1>
                        <p>Use the code below to synchronize your application identity.</p>
                        <div style="background: #4f46e5; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 20px; margin: 30px auto; max-width: 200px; letter-spacing: 5px;">
                            ${otp}
                        </div>
                        <p style="color: #64748b; font-size: 12px;">This code expires in 15 minutes.</p>
                    </div>
                `
            })
        });

        setVerifyingOtp(true);
        toast.success("Security OTP dispatched to your registered email.");
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, currentPath);
      setError(err.message || `Node Synchronization Error [${currentPath.toUpperCase()}]: Please verify identity parameters.`);
    } finally {
      setLoading(false);
    }
  }

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleVerifyOtp = async () => {
    const pending = (window as any)._pendingApp;
    if (!pending) {
        toast.error("Session integrity lost. Please restart application.");
        return;
    }
    
    if (otpInput === pending.otp) {
        setLoading(true);
        setError("");
        try {
            // Update application status to pending (verified)
            await updateDoc(doc(db, "applications", pending.appId), {
                status: "pending",
                verifiedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Notify Admin
            await addDoc(collection(db, "notifications"), {
                title: "New Clinical Application",
                message: `${form.fullName} has applied for the ${form.role} position.`,
                type: "application",
                targetId: pending.appId,
                read: false,
                createdAt: serverTimestamp()
            });

            setGeneratedCreds({ 
                username: pending.username, 
                password: pending.otp, 
                trackingToken: pending.trackingToken 
            } as any);
            
            setVerifyingOtp(false);
            setSubmitted(true);
            localStorage.removeItem("_pv_pending_app");
            toast.success("Identity authenticated & Application Submitted.");
        } catch (err: any) {
            handleFirestoreError(err, OperationType.UPDATE, "applications");
            setError("Cloud Synchronization Error: Please try again in 5 seconds.");
        } finally {
            setLoading(false);
        }
    } else {
        toast.error("Invalid security code.");
    }
  };

  const handleResendOtp = () => {
    const pending = (window as any)._pendingApp;
    if (!pending) return;
    
    setResendTimer(30);
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpInput(""); // Clear the field for the new attempt
    
    // Update the pending cache
    if ((window as any)._pendingApp) {
        (window as any)._pendingApp.otp = newOtp;
    }
    
    // Simulate re-dispatch through the clinical bridge
    fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            to: (window as any)._pendingApp?.username,
            subject: "PrimeVita Security Uplink: Your NEW OTP Code",
            html: `
                <div style="font-family: serif; padding: 40px; background: #f8fafc; text-align: center;">
                    <h1 style="color: #1e1b4b;">Security Re-Synchronization</h1>
                    <p>A new security code has been generated for your session.</p>
                    <div style="background: #4f46e5; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 20px; margin: 30px auto; max-width: 200px; letter-spacing: 5px;">
                        ${newOtp}
                    </div>
                </div>
            `
        })
    });

    toast.success(`Clinical relay re-synced. Check your email.`);
  };

  if (verifyingOtp) {
    const pending = (window as any)._pendingApp;
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 selection:bg-indigo-50 selection:text-indigo-600">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-premium text-center space-y-12 relative overflow-hidden"
            >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-50/50 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" />

                <div className="space-y-6 relative">
                    <div className="h-24 w-24 bg-indigo-600 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-glow rotate-3 ring-8 ring-indigo-50">
                        <Lock className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-4xl font-bold text-slate-900 tracking-tight italic serif">Security Uplink</h2>
                        <div className="flex items-center justify-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Identity Node Pending</p>
                        </div>
                    </div>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed px-4">
                        A clinical security code has been dispatched to <span className="text-indigo-600 font-bold block mt-1">{pending?.username}</span> via the PrimVita email gateway.
                    </p>
                </div>

                <div className="space-y-8 relative">
                    <div className="space-y-4">
                        <input 
                            type="text" 
                            maxLength={6}
                            placeholder="••••••"
                            value={otpInput}
                            autoFocus
                            onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                            className="w-full h-28 bg-slate-50 border-2 border-slate-100 text-center text-5xl font-mono font-bold tracking-[0.4em] rounded-[2.5rem] outline-none focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all uppercase px-4 placeholder:text-slate-200"
                        />
                        {error && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-rose-500 text-[10px] font-bold uppercase tracking-widest bg-rose-50 py-3 rounded-xl border border-rose-100">
                                {error}
                            </motion.div>
                        )}
                        <div className="flex items-center justify-between px-6">
                            <button 
                                onClick={handleResendOtp}
                                disabled={resendTimer > 0}
                                className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline disabled:text-slate-400 disabled:no-underline transition-all"
                            >
                                {resendTimer > 0 ? `Uplink Cool-off: ${resendTimer}s` : "Resend Security Code"}
                            </button>
                            <button onClick={() => {
                                setVerifyingOtp(false);
                                localStorage.removeItem("_pv_pending_app");
                            }} className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:underline transition-all">Terminate Handshake</button>
                        </div>
                    </div>

                    <button 
                        onClick={handleVerifyOtp}
                        disabled={otpInput.length < 6 || loading}
                        className="w-full h-18 bg-indigo-600 text-white rounded-3xl font-bold text-[11px] uppercase tracking-[0.2em] shadow-glow hover:bg-slate-900 transition-all disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-3"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Synchronize Identity"}
                    </button>
                </div>

                <div className="pt-10 border-t border-slate-100 mt-4 relative">
                    <div className="bg-slate-50 rounded-2xl p-6 text-left space-y-3">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Activity className="h-3 w-3 text-indigo-400" /> System Diagnostics
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                            Infrastructure: <span className="font-bold text-indigo-600">Dev Mode Enabled</span>. 
                            The SMTP relay is simulated for this deployment. 
                            Your generated code is: <span className="font-bold text-indigo-600 underline cursor-pointer hover:text-indigo-700 decoration-2" onClick={() => setOtpInput(pending?.otp || '')}>{pending?.otp}</span>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to secure buffer.`);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-slate-900">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[3.5rem] p-12 border border-border shadow-clinical text-center"
        >
          <div className="h-24 w-24 bg-emerald-50 text-emerald-600 rounded-[2rem] border border-emerald-100 flex items-center justify-center mx-auto mb-8 shadow-soft">
            <CheckCircle className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight italic serif mb-4">Onboarding Initiated</h1>
          
          {generatedCreds ? (
            <div className="space-y-8">
                <p className="text-muted-foreground font-medium leading-relaxed">
                  {form.type === 'patient' 
                    ? "Your identity node has been established. You MUST store these parameters immediately."
                    : "Application synchronized. Use these parameters to track your deployment roadmap."}
                </p>
                
                <div className="space-y-4">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-left relative group">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                            {form.type === 'patient' ? "System Username" : "Staff Tracking Token"}
                        </label>
                        <div className="text-lg font-bold text-primary italic serif flex items-center justify-between">
                            {form.type === 'patient' ? generatedCreds.username : (generatedCreds as any).trackingToken}
                            <button onClick={() => copyToClipboard(form.type === 'patient' ? generatedCreds.username : (generatedCreds as any).trackingToken, "Identifier")} className="hover:text-indigo-600 transition-colors">
                                <Copy className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-left relative group">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                            {form.type === 'patient' ? "Access Token (One-time visible)" : "Security OTP (Valid for 15m)"}
                        </label>
                        <div className="text-lg font-bold text-primary italic serif flex items-center justify-between">
                            {generatedCreds.password}
                            <button onClick={() => copyToClipboard(generatedCreds.password!, "Security Code")} className="hover:text-indigo-600 transition-colors">
                                <Copy className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {form.type === 'staff' && (
                    <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl text-left space-y-2">
                        <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Secure Tracking Hub</div>
                        <p className="text-[10px] font-medium text-indigo-600 leading-relaxed">
                            Access your roadmap at: <span className="font-bold underline">/portal/track/{(generatedCreds as any).trackingToken}</span>
                        </p>
                        <Link 
                            to="/portal/track/$token" 
                            params={{ token: (generatedCreds as any).trackingToken }}
                            className="inline-block pt-2 text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-2"
                        >
                            Open Pipeline Dashboard <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                )}

                <div className="flex items-center gap-4 p-6 bg-amber-50 rounded-2xl border border-amber-100">
                    <input 
                        type="checkbox" 
                        checked={credsSaved} 
                        onChange={e => setCredsSaved(e.target.checked)}
                        className="h-5 w-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500" 
                    />
                    <span className="text-[11px] font-medium text-amber-900 text-left">
                        {form.type === 'patient' 
                            ? "I have securely archived my credentials for future clinical synchronization."
                            : "I have saved my tracking token and security code for status verification."}
                    </span>
                </div>

                <button 
                  onClick={() => navigate({ to: form.type === 'patient' ? "/portal/auth" : "/" })}
                  disabled={!credsSaved}
                  className="w-full h-16 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-premium hover:shadow-glow transition-all disabled:opacity-50"
                >
                  {form.type === 'patient' ? "Go to Patient Portal" : "Return to Gateway"}
                </button>
            </div>
          ) : (
            <>
                <p className="text-muted-foreground font-medium mb-10 leading-relaxed">
                  Your clinical deployment request has been routed for administrative verification. 
                </p>
                <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 mb-10">
                    <span className="text-xs font-bold text-indigo-700">STATUS: PENDING REVIEW</span>
                </div>
                <button 
                  onClick={() => navigate({ to: "/" })}
                  className="w-full h-14 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-premium hover:shadow-glow transition-all"
                >
                  Return to Gate
                </button>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 text-slate-900">
      <header className="h-24 bg-white/80 backdrop-blur-md border-b border-border px-8 flex items-center justify-between sticky top-0 z-50">
         <Link to="/" className="flex items-center gap-3 no-underline group">
            <div className="bg-indigo-500/5 p-1 rounded-xl border border-indigo-500/10 group-hover:rotate-12 transition-transform">
               <PrimeVitaLogo className="h-10 w-10 text-primary" />
            </div>
            <div className="hidden md:block leading-tight">
               <div className="font-display text-xl font-bold text-primary italic serif">PrimeVita</div>
               <div className="text-[7px] tracking-[0.4em] uppercase text-primary/40 font-bold">Network Onboarding</div>
            </div>
         </Link>
         
         <div className="flex items-center gap-4">
            {[0, 1, 2, 3, 4, 5].map((s) => (
                <div 
                    key={s} 
                    className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step >= s ? 'bg-primary' : 'bg-secondary'}`} 
                />
            ))}
         </div>

         <div className="hidden sm:flex items-center gap-8 text-[10px] font-bold uppercase tracking-widest text-primary/40">
            <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> ISO-9001 Encrypted</span>
         </div>
      </header>

      <main className="flex-1 py-12 px-6 flex flex-col items-center">
        <div className="w-full max-w-4xl">
            <AnimatePresence mode="wait">
                {step === 0 && (
                    <motion.div 
                        key="step0"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-12 text-center"
                    >
                        <div className="space-y-4">
                            <h1 className="text-5xl font-bold tracking-tight italic serif">Begin Your Journey</h1>
                            <p className="text-muted-foreground font-medium max-w-xl mx-auto">Select your entry point into the PrimeVita health ecosystem. Each pathway follows a unique verification logic.</p>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-8">
                            <SelectionCard 
                                icon={Heart}
                                title="Patient Admission"
                                desc="Join our world-class domiciliary care network for specialized medical attention."
                                onClick={() => { updateForm({ type: 'patient' }); nextStep(); }}
                                variant="rose"
                            />
                            <SelectionCard 
                                icon={Stethoscope}
                                title="Clinical Deployment"
                                desc="Professional opportunities for Doctors, Nurses, and Clinical Specialists."
                                onClick={() => { updateForm({ type: 'staff' }); nextStep(); }}
                                variant="emerald"
                            />
                        </div>
                    </motion.div>
                )}

                {step === 1 && (
                    <motion.div 
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-10"
                    >
                        <StepHeader 
                            title="Biodata Synchronization" 
                            subtitle="Core identity parameters for centralized record keeping." 
                            onBack={prevStep}
                        />
                        <div className="bg-white rounded-[3rem] p-12 border border-border shadow-clinical space-y-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <LabelInput label="Legal Full Name" value={form.fullName} onChange={v => updateForm({ fullName: v })} placeholder="e.g. Dr. John Carter" />
                                <LabelInput label="Email Interface" type="email" value={form.email} onChange={v => updateForm({ email: v })} placeholder="contact@example.com" />
                            </div>
                            <div className="grid md:grid-cols-2 gap-8">
                                <LabelInput label="Date of Birth" type="date" value={form.dob} onChange={v => updateForm({ dob: v })} />
                                <LabelInput label="Phone Uplink" value={form.phone} onChange={v => updateForm({ phone: v })} placeholder="+234..." />
                            </div>
                            <LabelInput label="Residential Coordinates" value={form.address} onChange={v => updateForm({ address: v })} placeholder="Full physical address" />
                            
                            <button 
                                onClick={nextStep}
                                disabled={!form.fullName || !form.email || !form.phone || (form.type === 'staff' && !form.dob)}
                                className="w-full h-16 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-premium hover:shadow-glow transition-all disabled:opacity-50"
                            >
                                Continue to Verification
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 2 && form.type === 'patient' && (
                    <motion.div 
                        key="step2p"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-10"
                    >
                        <StepHeader 
                            title="Clinical Context" 
                            subtitle="Medical history synchronization for precision care mapping." 
                            onBack={prevStep}
                        />
                        <div className="bg-white rounded-[3rem] p-12 border border-border shadow-clinical space-y-8">
                            <div className="space-y-8">
                                <TextArea label="Current Medical Conditions" value={form.medicalConditions} onChange={v => updateForm({ medicalConditions: v })} placeholder="List all diagnosed conditions..." />
                                <TextArea label="Active Medications" value={form.medications} onChange={v => updateForm({ medications: v })} placeholder="Drug names, dosage, frequency..." />
                                <TextArea label="Biological Allergies" value={form.allergies} onChange={v => updateForm({ allergies: v })} placeholder="Environmental, food, or chemical sensitivities..." />
                            </div>
                            <button 
                                onClick={nextStep}
                                className="w-full h-16 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-premium hover:shadow-glow transition-all"
                            >
                                Security Contacts
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 2 && form.type === 'staff' && (
                    <motion.div 
                        key="step2s"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-10"
                    >
                        <StepHeader 
                            title="Clinical Document Upload" 
                            subtitle="Scan and upload your professional credentials." 
                            onBack={prevStep}
                        />
                        <div className="bg-white rounded-[3rem] p-12 border border-border shadow-clinical space-y-8">
                            <div className="grid md:grid-cols-3 gap-6">
                                <FileUploadNode 
                                    label="CV / Resume" 
                                    accept=".pdf,.doc,.docx"
                                    onFile={f => updateForm({ cvFile: f })}
                                    file={form.cvFile}
                                />
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">License Type</label>
                                    <select 
                                        className="w-full h-14 bg-secondary/20 border border-border px-4 rounded-xl text-[10px] font-bold"
                                        value={form.license.type}
                                        onChange={e => updateForm({ license: { ...form.license, type: e.target.value } })}
                                    >
                                        <option>Professional License</option>
                                        <option>Certification</option>
                                        <option>Both</option>
                                    </select>
                                    <FileUploadNode 
                                        label="Certification" 
                                        onFile={f => updateForm({ license: { ...form.license, file: f } })}
                                        file={form.license.file}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Identity Document</label>
                                    <select 
                                        className="w-full h-14 bg-secondary/20 border border-border px-4 rounded-xl text-[10px] font-bold"
                                        value={form.identity.type}
                                        onChange={e => updateForm({ identity: { ...form.identity, type: e.target.value } })}
                                    >
                                        <option>National ID Card</option>
                                        <option>Voter's Card</option>
                                        <option>International Passport</option>
                                        <option>Driver's License</option>
                                    </select>
                                    <FileUploadNode 
                                        label="ID Copy" 
                                        onFile={f => updateForm({ identity: { ...form.identity, file: f } })}
                                        file={form.identity.file}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Designated Clinical Role</label>
                                <select 
                                    className="w-full h-14 bg-secondary/30 border border-border px-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                    value={form.role}
                                    onChange={e => updateForm({ role: e.target.value })}
                                >
                                    <option value="nurse">Registered Nurse</option>
                                    <option value="doctor">Medical Doctor</option>
                                    <option value="caregiver">Certified Caregiver</option>
                                    <option value="physiotherapist">Physiotherapist</option>
                                </select>
                            </div>
                            <button 
                                onClick={nextStep}
                                disabled={!form.cvFile || !form.license.file || !form.identity.file}
                                className="w-full h-16 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-premium hover:shadow-glow transition-all disabled:opacity-50"
                            >
                                Education Records
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 3 && form.type === 'patient' && (
                    <motion.div 
                        key="step3p"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-10"
                    >
                        <StepHeader 
                            title="Emergency Contact Database" 
                            subtitle="Mandatory security anchoring for patient safety protocols." 
                            onBack={prevStep}
                        />
                        <div className="bg-white rounded-[3rem] p-12 border border-border shadow-clinical space-y-12">
                            <div className="space-y-10">
                                {form.emergencyContacts.map((contact, idx) => (
                                    <div key={idx} className="space-y-8 p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-primary text-white rounded-xl flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                                            <h4 className="font-bold text-primary italic serif">Primary Security Node</h4>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-8">
                                            <LabelInput label="Contact Full Name" value={contact.fullName} onChange={v => {
                                                const newContacts = [...form.emergencyContacts];
                                                newContacts[idx].fullName = v;
                                                updateForm({ emergencyContacts: newContacts });
                                            }} placeholder="Full legal name" />
                                            <LabelInput label="Relationship" value={contact.relationship} onChange={v => {
                                                const newContacts = [...form.emergencyContacts];
                                                newContacts[idx].relationship = v;
                                                updateForm({ emergencyContacts: newContacts });
                                            }} placeholder="e.g. Spouse, Son..." />
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-8">
                                            <LabelInput label="Primary Phone" value={contact.phone} onChange={v => {
                                                const newContacts = [...form.emergencyContacts];
                                                newContacts[idx].phone = v;
                                                updateForm({ emergencyContacts: newContacts });
                                            }} placeholder="+1..." />
                                            <LabelInput label="Alternate Phone" value={contact.phoneAlt} onChange={v => {
                                                const newContacts = [...form.emergencyContacts];
                                                newContacts[idx].phoneAlt = v;
                                                updateForm({ emergencyContacts: newContacts });
                                            }} placeholder="Secondary contact" />
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">ID Verification Type</label>
                                                <select 
                                                    className="w-full h-14 bg-white border border-border px-6 rounded-2xl text-xs font-bold"
                                                    value={contact.idType}
                                                    onChange={e => {
                                                        const newContacts = [...form.emergencyContacts];
                                                        newContacts[idx].idType = e.target.value;
                                                        updateForm({ emergencyContacts: newContacts });
                                                    }}
                                                >
                                                    <option>National ID</option>
                                                    <option>Driver's License</option>
                                                    <option>Passport</option>
                                                </select>
                                            </div>
                                            <LabelInput label="ID Serial Number" value={contact.idNumber} onChange={v => {
                                                const newContacts = [...form.emergencyContacts];
                                                newContacts[idx].idNumber = v;
                                                updateForm({ emergencyContacts: newContacts });
                                            }} placeholder="Reference number" />
                                        </div>
                                        <LabelInput label="Physical Address" value={contact.address} onChange={v => {
                                            const newContacts = [...form.emergencyContacts];
                                            newContacts[idx].address = v;
                                            updateForm({ emergencyContacts: newContacts });
                                        }} placeholder="Contact residential location" />
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={nextStep}
                                disabled={!form.emergencyContacts[0].fullName || !form.emergencyContacts[0].phone}
                                className="w-full h-16 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-premium hover:shadow-glow transition-all disabled:opacity-50"
                            >
                                Finalize Admission
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 3 && form.type === 'staff' && (
                    <motion.div 
                        key="step3s"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-10"
                    >
                        <StepHeader 
                            title="Academic Registry" 
                            subtitle="Document your educational history and qualifications." 
                            onBack={prevStep}
                        />
                        <div className="bg-white rounded-[3rem] p-12 border border-border shadow-clinical space-y-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <LabelInput label="School Name" value={form.education.school} onChange={v => updateForm({ education: { ...form.education, school: v } })} placeholder="University/Institution" />
                                <LabelInput label="Qualification Obtained" value={form.education.qualification} onChange={v => updateForm({ education: { ...form.education, qualification: v } })} placeholder="e.g. BSc Nursing" />
                            </div>
                            <div className="grid md:grid-cols-2 gap-8">
                                <LabelInput label="Year of Graduation" type="number" value={form.education.year} onChange={v => updateForm({ education: { ...form.education, year: v } })} placeholder="YYYY" />
                                <FileUploadNode 
                                    label="Education Document" 
                                    onFile={f => updateForm({ education: { ...form.education, file: f } })}
                                    file={form.education.file}
                                />
                            </div>
                            <button 
                                onClick={nextStep}
                                disabled={!form.education.school || !form.education.qualification || !form.education.year || !form.education.file}
                                className="w-full h-16 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-premium hover:shadow-glow transition-all disabled:opacity-50"
                            >
                                Guarantor Accountability
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 4 && form.type === 'staff' && (
                    <motion.div 
                        key="step4s"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-10"
                    >
                        <StepHeader 
                            title="Guarantor Verification" 
                            subtitle="Establish accountability anchors for your deployment." 
                            onBack={prevStep}
                        />
                        <div className="bg-white rounded-[3rem] p-12 border border-border shadow-clinical space-y-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <LabelInput label="Guarantor Full Name" value={form.guarantor.fullName} onChange={v => updateForm({ guarantor: { ...form.guarantor, fullName: v } })} />
                                <LabelInput label="Relationship" value={form.guarantor.relationship} onChange={v => updateForm({ guarantor: { ...form.guarantor, relationship: v } })} />
                            </div>
                            <div className="grid md:grid-cols-3 gap-8">
                                <LabelInput label="Phone" value={form.guarantor.phone} onChange={v => updateForm({ guarantor: { ...form.guarantor, phone: v } })} />
                                <LabelInput label="Occupation" value={form.guarantor.occupation} onChange={v => updateForm({ guarantor: { ...form.guarantor, occupation: v } })} />
                                <LabelInput label="Ref ID Number" value={form.guarantor.refId} onChange={v => updateForm({ guarantor: { ...form.guarantor, refId: v } })} />
                            </div>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">ID Type</label>
                                    <select 
                                        className="w-full h-14 bg-secondary/20 border border-border px-4 rounded-xl text-[10px] font-bold"
                                        value={form.guarantor.idType}
                                        onChange={e => updateForm({ guarantor: { ...form.guarantor, idType: e.target.value } })}
                                    >
                                        <option>National ID Card</option>
                                        <option>Voter's Card</option>
                                        <option>International Passport</option>
                                        <option>Driver's License</option>
                                    </select>
                                </div>
                                <FileUploadNode 
                                    label="Guarantor ID Upload" 
                                    onFile={f => updateForm({ guarantor: { ...form.guarantor, idFile: f } })}
                                    file={form.guarantor.idFile}
                                />
                            </div>
                            <LabelInput label="Physical Address" value={form.guarantor.address} onChange={v => updateForm({ guarantor: { ...form.guarantor, address: v } })} />
                            <button 
                                onClick={nextStep}
                                disabled={!form.guarantor.fullName || !form.guarantor.phone || !form.guarantor.idFile}
                                className="w-full h-16 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-premium hover:shadow-glow transition-all disabled:opacity-50"
                            >
                                Declaration & Submit
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 5 && form.type === 'staff' && (
                    <motion.div 
                        key="step5s"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-10"
                    >
                        <StepHeader 
                            title="Declaration & Submission" 
                            subtitle="Legal confirmation of data authenticity." 
                            onBack={prevStep}
                        />
                        <div className="bg-white rounded-[3rem] p-16 border border-border shadow-clinical text-center space-y-10">
                            <div className="p-10 bg-rose-50 border border-rose-100 rounded-[2.5rem] text-left">
                                <h3 className="text-rose-600 font-bold uppercase tracking-widest text-xs mb-4">Mandatory Declaration</h3>
                                <p className="text-rose-700 text-sm font-medium leading-relaxed italic">
                                    "I hereby declare that all information provided is true and authentic. Any falsification may result in disqualification and possible legal/government action."
                                </p>
                            </div>

                            <div className="flex items-center gap-4 p-8 bg-slate-50 rounded-2xl border border-slate-100">
                                <input 
                                    type="checkbox" 
                                    checked={form.declarationAgreed}
                                    onChange={e => updateForm({ declarationAgreed: e.target.checked })}
                                    className="h-6 w-6 rounded border-slate-300 text-primary focus:ring-primary" 
                                />
                                <span className="text-sm font-bold text-primary italic">I agree to this declaration and clinical security protocols.</span>
                            </div>

                            {error && <p className="text-rose-600 text-xs font-bold uppercase tracking-widest bg-rose-50 p-4 rounded-xl">{error}</p>}

                            <button 
                                onClick={handleSubmit}
                                disabled={loading || !form.declarationAgreed}
                                className="w-full h-20 bg-primary text-white rounded-[2rem] font-bold text-sm uppercase tracking-[0.3em] shadow-premium hover:shadow-glow transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Submit Application <Send className="h-5 w-5" /></>}
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 4 && form.type === 'patient' && (
                    <motion.div 
                        key="step4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-10"
                    >
                        <StepHeader 
                            title={form.type === 'patient' ? "Final Clinical Authorization" : "Account Security Setup"} 
                            subtitle={form.type === 'patient' ? "Confirming bio-identity and generating secure access tokens." : "Establish your authenticated node parameters."} 
                            onBack={prevStep}
                        />
                        <div className="bg-white rounded-[3rem] p-12 border border-border shadow-clinical space-y-8">
                             <div className="p-8 bg-amber-50 rounded-3xl border border-amber-100/50 flex items-start gap-4">
                                <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0" />
                                <div className="space-y-2">
                                    <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
                                        {form.type === 'patient' 
                                            ? "Upon authorization, our system will generate a secure clinical ID and access token. You MUST archive these credentials immediately."
                                            : "Your account remains INACTIVE until authorized by the Security Board. You will use these credentials to track your application status."
                                        }
                                    </p>
                                </div>
                             </div>

                             <div className="grid md:grid-cols-2 gap-8">
                                <LabelInput label="Verified Email Proxy" value={form.email} onChange={() => {}} disabled placeholder="Synced from biodata" />
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Clinical Access Token</label>
                                    <div className="h-14 bg-secondary/10 border border-border/50 px-6 rounded-2xl flex items-center text-[10px] font-bold text-muted-foreground italic">
                                        [ SYSTEM GENERATED ON SUBMISSION ]
                                    </div>
                                </div>
                             </div>

                             {form.type === 'patient' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Preferred Financial Settlement</label>
                                    <select 
                                        className="w-full h-14 bg-secondary/30 border border-border px-6 rounded-2xl text-xs font-bold"
                                        value={form.paymentMethod}
                                        onChange={e => updateForm({ paymentMethod: e.target.value })}
                                    >
                                        <option>Private Insurance</option>
                                        <option>Direct Debit</option>
                                        <option>Government Subsidy</option>
                                        <option>Out-of-Pocket</option>
                                    </select>
                                </div>
                             )}

                             <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary" required defaultChecked={true} />
                                <span className="text-[11px] font-medium text-muted-foreground">I verified that all bio-security data provided is complete and legally binding.</span>
                             </div>

                             {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-bold uppercase tracking-widest">
                                    {error}
                                </div>
                             )}

                             <button 
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full h-20 bg-primary text-white rounded-[2rem] font-bold text-sm uppercase tracking-[0.3em] shadow-premium hover:shadow-glow transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Final Authorization <ArrowRight className="h-5 w-5" /></>}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function FileUploadNode({ label, accept, onFile, file }: { label: string; accept?: string; onFile: (f: File) => void; file: File | null }) {
    return (
        <div className="space-y-2">
            <div 
                onClick={() => document.getElementById(`file-${label}`)?.click()}
                className={`p-6 bg-secondary/10 border border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-secondary/20 transition-all cursor-pointer group h-32 ${file ? 'border-emerald-500 bg-emerald-50/50' : ''}`}
            >
                <input 
                    type="file" 
                    id={`file-${label}`} 
                    className="hidden" 
                    accept={accept} 
                    onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} 
                />
                <FileCheck className={`h-5 w-5 transition-colors ${file ? 'text-emerald-600' : 'text-muted-foreground group-hover:text-primary'}`} />
                <span className={`text-[8px] font-bold uppercase tracking-widest text-center ${file ? 'text-emerald-700' : 'text-muted-foreground group-hover:text-primary'}`}>
                    {file ? file.name.substring(0, 15) + '...' : `Upload ${label}`}
                </span>
                {file && <span className="text-[7px] text-emerald-600 font-bold uppercase">VERIFIED</span>}
            </div>
        </div>
    );
}

function SelectionCard({ icon: Icon, title, desc, onClick, variant }: any) {
    const colors = variant === 'rose' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600';
    return (
        <button 
            onClick={onClick}
            className="group p-12 bg-white rounded-[3.5rem] border border-border shadow-clinical text-left hover:scale-[1.02] active:scale-95 transition-all duration-500 relative overflow-hidden"
        >
            <div className={`h-20 w-20 rounded-[2rem] mb-10 flex items-center justify-center ${colors} group-hover:scale-110 transition-transform`}>
                <Icon className="h-10 w-10" />
            </div>
            <h3 className="text-3xl font-bold text-primary italic serif mb-4 group-hover:translate-x-2 transition-transform">{title}</h3>
            <p className="text-muted-foreground font-medium leading-relaxed mb-10 opacity-70 group-hover:opacity-100 transition-opacity">{desc}</p>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary group-hover:gap-4 transition-all">
                Access Gateway <ArrowRight className="h-4 w-4" />
            </div>
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 h-40 w-40 rounded-full blur-[80px] -mr-20 -mt-20 opacity-10 ${colors}`} />
        </button>
    );
}

function StepHeader({ title, subtitle, onBack }: any) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-4xl font-bold text-primary tracking-tight italic serif mb-2">{title}</h2>
                <p className="text-muted-foreground font-medium">{subtitle}</p>
            </div>
            <button 
                onClick={onBack}
                className="h-14 w-14 bg-white border border-border rounded-2xl flex items-center justify-center hover:bg-secondary transition-all"
            >
                <div className="h-5 w-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin-slow rotate-45" />
                <span className="absolute text-[9px] font-bold uppercase tracking-widest text-primary/40">Prev</span>
            </button>
        </div>
    );
}

function LabelInput({ label, value, onChange, type = "text", placeholder, required = true }: any) {
    return (
        <div className="space-y-3 group">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-primary transition-colors">{label}</label>
            <input 
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                className="w-full h-14 bg-secondary/30 border border-border px-6 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all" 
            />
        </div>
    );
}

function TextArea({ label, value, onChange, placeholder }: any) {
    return (
        <div className="space-y-3 group">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 group-focus-within:text-primary transition-colors">{label}</label>
            <textarea 
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                rows={3}
                className="w-full bg-secondary/30 border border-border p-6 rounded-[2rem] text-xs font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all resize-none placeholder:font-normal placeholder:opacity-50" 
            />
        </div>
    );
}

