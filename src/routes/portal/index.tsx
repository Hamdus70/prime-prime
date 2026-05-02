import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { UserPlus, Stethoscope, UserCircle, ShieldCheck, ArrowRight, LayoutDashboard, Database, ClipboardList, Activity, LogOut } from "lucide-react";
import { useAuth } from "../portal";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "motion/react";
import { BrandContextBanner } from "@/components/BrandComponents";

export const Route = createFileRoute("/portal/")({
  component: PortalIndex,
});

function PortalIndex() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<{ role: string; fullName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "user_profiles", user.uid));
          if (snap.exists()) {
            setProfile({
              role: snap.data().role,
              fullName: snap.data().fullName,
            });
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      }
      setLoading(false);
    }
    if (!authLoading) {
      if (!user) navigate({ to: "/portal/auth" });
      fetchProfile();
    }
  }, [user, authLoading]);

  const role = profile?.role;

  const portals = [
    {
      title: "Patient Experience",
      subtitle: "For Families",
      desc: "Access clinical records, biometric dashboard, and your care plan.",
      icon: UserCircle,
      to: "/portal/patient",
      accent: "text-blue-600 bg-blue-50/50",
      stats: ["Clinical History", "Vitals Dash"],
    },
    {
      title: "Clinician Node",
      subtitle: "For Providers",
      desc: "The professional clinical workspace for RNs, Doctors, and Therapists.",
      icon: Stethoscope,
      to: "/portal/staff",
      accent: "text-emerald-600 bg-emerald-50/50",
      stats: ["EMR Management", "Shift Control"],
    },
    {
      title: "Join The Network",
      subtitle: "For Applicants",
      desc: "Begin your journey. Submit your application to join our elite clinical team.",
      icon: UserPlus,
      to: "/portal/apply",
      accent: "text-amber-600 bg-amber-50/50",
      stats: ["Open Roles", "Onboarding Status"],
    },
    {
      title: "Admin Centre",
      subtitle: "For Management",
      desc: "Central command for applications, staff monitoring, attendance, and finance.",
      icon: ShieldCheck,
      to: "/portal/admin",
      accent: "text-slate-700 bg-slate-50",
      stats: ["System Control", "Audit Logs"],
    }
  ];

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <Activity className="h-10 w-10 text-primary animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Initializing PrimeVita Security Nodes...</p>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-[90vh]">
      <BrandContextBanner size="slim" />
      
      <div className="max-w-7xl mx-auto px-6 py-20 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-5 py-2 bg-primary/5 border border-primary/10 rounded-full text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-10"
        >
          <ShieldCheck className="h-4 w-4 text-accent" /> Federal Compliance Verified
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-7xl font-bold text-primary tracking-tighter font-display mb-8 italic serif"
        >
          PrimeVita <span className="text-slate-200">Ecosystem.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-xl font-medium max-w-2xl mx-auto leading-relaxed mb-16"
        >
          Welcome back, <span className="text-primary font-bold">{profile?.fullName || "Authorized User"}</span>. <br />Select your designated clinical gateway below.
        </motion.p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {portals.map((p, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.2 }}
              className="group bg-white rounded-[3.5rem] p-8 border border-slate-100 shadow-clinical transition-all hover:shadow-premium hover:-translate-y-2 relative overflow-hidden flex flex-col items-start text-left"
            >
              <div className={`h-20 w-20 rounded-[2rem] ${p.accent} border border-primary/5 flex items-center justify-center mb-8 transition-transform group-hover:scale-110 duration-500`}>
                <p.icon className={`h-10 w-10 ${p.accent.split(' ')[0]}`} />
              </div>
              
              <div className="mb-6">
                <span className="text-[10px] font-bold text-accent uppercase tracking-widest">{p.subtitle}</span>
                <h2 className="text-2xl font-bold text-primary leading-tight font-display italic serif tracking-tight mt-1">{p.title}</h2>
              </div>
              
              <p className="text-muted-foreground leading-relaxed mb-8 text-sm font-medium flex-1">{p.desc}</p>
              
              <Link 
                to={p.to} 
                className="w-full inline-flex items-center justify-center gap-3 rounded-2xl bg-primary text-white py-4 font-bold uppercase tracking-widest shadow-premium hover:shadow-glow transition-all no-underline group/btn text-[10px]"
              >
                Launch Hub
                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-2 text-accent" />
              </Link>
            </motion.div>
          ))}
        </div>

        {user && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-24 flex flex-col items-center gap-6"
          >
            <div className="px-8 py-5 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-100 shadow-sm text-[11px] font-bold uppercase tracking-widest flex items-center gap-6">
              <span className="text-muted-foreground">Node Status: <span className="text-emerald-500">ACTIVE</span></span>
              <div className="h-4 w-px bg-slate-200" />
              <span className="text-primary/60">{user.email}</span>
              <div className="h-4 w-px bg-slate-200" />
              <button 
                onClick={() => {
                  auth.signOut().then(() => navigate({ to: "/portal/auth" }));
                }}
                className="text-rose-500 hover:underline transition-all flex items-center gap-2"
              >
                <LogOut className="h-3.5 w-3.5" /> Deactivate Session
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

