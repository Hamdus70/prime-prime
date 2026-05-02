import { createFileRoute, useNavigate, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../portal";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Stethoscope, Users, LogOut, ChevronRight, Search, Heart, Pill, Microscope, Baby, Activity } from "lucide-react";
import { motion } from "motion/react";
import { PrimeVitaLogo } from "@/components/PrimeVitaLogo";

export const Route = createFileRoute("/portal/staff")({
  component: StaffLayout,
});

function StaffLayout() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/portal/auth", search: { redirect: "/portal/staff" } });
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  async function fetchProfile() {
    setLoading(true);
    try {
      const profRef = doc(db, "user_profiles", user!.uid);
      const profSnap = await getDoc(profRef);
      setProfile(profSnap.data());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Stethoscope className="h-10 w-10 text-emerald-600 animate-pulse" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Staff Node...</p>
      </div>
    );
  }

  if (!profile || (profile.role !== "staff" && profile.role !== "admin")) {
    return (
       <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-10 bg-white rounded-3xl border border-border shadow-clinical max-w-sm">
             <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <LogOut className="h-8 w-8" />
             </div>
             <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
             <p className="text-sm text-slate-500 mb-6 font-medium">Your account does not have clinical staff privileges.</p>
             <button onClick={() => auth.signOut()} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest">Sign Out</button>
          </div>
       </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#F8FAFC] selection:bg-emerald-100 selection:text-emerald-900">
      {/* Clinician Sidebar */}
      <aside className="w-80 border-r border-[#E2E8F0] bg-white flex flex-col relative z-20 shadow-xl">
        <div className="p-8 border-b border-[#E2E8F0] bg-white text-emerald-600">
           <Link to="/portal/staff" className="flex items-center gap-3 no-underline mb-8">
              <div className="bg-emerald-500/5 p-1 rounded-xl border border-emerald-500/10 transition-transform">
                 <PrimeVitaLogo className="h-10 w-10 text-emerald-600" />
              </div>
              <h2 className="font-bold text-lg text-emerald-800 tracking-tight italic serif">Staff Node</h2>
           </Link>
           
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-emerald-600 transition-colors" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Global medical search..." 
                className="w-full pl-11 pr-4 py-3 bg-secondary/50 rounded-2xl border border-border text-sm outline-none focus:ring-4 focus:ring-emerald-50 transition-all font-medium" 
              />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
          <section>
            <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-600/60 mb-3 px-4">Core Portal</h3>
            <Link 
              to="/portal/staff"
              activeProps={{ className: "bg-emerald-50 !text-emerald-600 border-emerald-100" }}
              className="flex items-center gap-3 p-3 rounded-2xl text-emerald-900/60 hover:text-emerald-600 transition-all no-underline group border border-transparent hover:border-emerald-100"
            >
              <Users className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Patient Records</span>
            </Link>
          </section>

          <section>
            <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-600/60 mb-3 px-4">Department Hubs</h3>
            <div className="grid grid-cols-1 gap-2">
               <DepartmentNavLink to="/portal/staff/family-medicine" icon={Activity} label="Family Medicine" />
               <DepartmentNavLink to="/portal/staff/internal-medicine" icon={Heart} label="Internal Medicine" />
               <DepartmentNavLink to="/portal/staff/surgery" icon={Stethoscope} label="Surgery Units" />
               <DepartmentNavLink to="/portal/staff/paediatric-surgery" icon={Baby} label="Paediatric Surgery" />
               <DepartmentNavLink to="/portal/staff/obstetrics-gynae" icon={Users} label="Obs & Gynae" />
               <DepartmentNavLink to="/portal/staff/pharmacy" icon={Pill} label="Pharmacy" />
               <DepartmentNavLink to="/portal/staff/laboratory" icon={Microscope} label="Laboratory" />
               <DepartmentNavLink to="/portal/staff/paediatrics" icon={Baby} label="Paediatrics" />
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-[#E2E8F0] bg-white">
          <div className="flex items-center gap-4 bg-emerald-50/50 p-4 rounded-3xl border border-emerald-100">
            <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
              {profile.fullName?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-emerald-900 truncate uppercase tracking-wider">{profile.fullName}</div>
              <div className="text-[8px] font-bold uppercase text-emerald-600/60 tracking-widest">Medical Personnel</div>
            </div>
            <button onClick={() => auth.signOut()} className="h-9 w-9 flex items-center justify-center hover:bg-rose-50 text-rose-500 rounded-xl transition-all">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-[#F8FAFC]">
          <Outlet />
      </main>
    </div>
  );
}

function DepartmentNavLink({ to, icon: Icon, label }: any) {
  return (
    <Link 
      to={to} 
      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-emerald-50 text-emerald-900/60 hover:text-emerald-600 transition-all no-underline group border border-transparent hover:border-emerald-100"
      activeProps={{ className: "bg-emerald-50 !text-emerald-600 border-emerald-100" }}
    >
      <div className="h-8 w-8 rounded-xl bg-white shadow-sm border border-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
      <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}
