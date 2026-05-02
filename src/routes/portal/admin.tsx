import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../portal";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { ShieldCheck, Users, UserPlus, ClipboardList, Activity, LayoutDashboard, Search, ChevronRight, MoreHorizontal, Filter, Download, ArrowRight, Stethoscope, Database, Phone, FileText, Check, X, Clock, MessageSquare, AlertCircle, LogOut, Wallet, Megaphone, CalendarCheck, User, MapPin, ShieldAlert, Landmark, Mail, Briefcase } from "lucide-react";
import { handleFirestoreError, OperationType } from "@/lib/firestore-errors";
import { motion, AnimatePresence } from "motion/react";
import { PrimeVitaLogo } from "@/components/PrimeVitaLogo";
import { auth } from "@/lib/firebase";

export const Route = createFileRoute("/portal/admin")({
  component: AdminPortal,
});

// Simple hashing function for demo purposes
async function hashPassword(password: string) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function AdminPortal() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [view, setView] = useState<"overview" | "patients" | "staff" | "applications" | "finance" | "announcements" | "attendance" | "audit">("overview");
  const [data, setData] = useState<any>({ patients: [], staff: [], applications: [], payments: [], attendance: [], announcements: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [screeningNotes, setScreeningNotes] = useState("");
  const [updatingApp, setUpdatingApp] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/portal/auth", search: { redirect: "/portal/admin" } });
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      fetchAdminData();
    }
  }, [user]);

  async function logAdminAction(action: string, targetId: string, details: string) {
    if (!user) return;
    try {
      await setDoc(doc(collection(db, "audit_logs")), {
        adminId: user.uid,
        adminName: profile?.fullName || "Admin",
        action,
        targetId,
        details,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Log bypass:", err);
    }
  }

  async function generateStaffUsername(role: string) {
    const roleMap: Record<string, string> = {
      nurse: "NUR",
      doctor: "DOC",
      caregiver: "CRG",
      physiotherapist: "PHY"
    };
    const prefix = roleMap[role.toLowerCase()] || "STF";
    
    // We'll use a simple random suffix for unique usernames in this demo logic
    // but the requirement says HSP-[ROLE]-0001. We'll follow the pattern.
    const counterRef = doc(db, "counters", `staff_id_${prefix}`);
    let nextId = 1;
    
    try {
        const counterSnap = await getDoc(counterRef);
        if (counterSnap.exists()) {
            nextId = counterSnap.data().current + 1;
            await updateDoc(counterRef, { current: nextId });
        } else {
            await setDoc(counterRef, { current: 1 });
        }
    } catch (e) {
        nextId = Math.floor(Math.random() * 1000);
    }

    return `HSP-${prefix}-${nextId.toString().padStart(4, "0")}`;
  }

  async function fetchAdminData() {
    setLoading(true);
    try {
      const profSnap = await getDoc(doc(db, "user_profiles", user!.uid));
      const profData = profSnap.data();
      
      if (!profData || profData.role !== "admin") {
        setLoading(false);
        return;
      }
      setProfile(profData);

      const [pSnap, uSnap, aSnap, attSnap, annSnap, logSnap, notifSnap] = await Promise.all([
        getDocs(collection(db, "patients")),
        getDocs(collection(db, "user_profiles")),
        getDocs(collection(db, "applications")),
        getDocs(collection(db, "attendance")),
        getDocs(collection(db, "announcements")),
        getDocs(collection(db, "audit_logs")),
        getDocs(collection(db, "notifications"))
      ]);

      setData({
        patients: pSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        staff: uSnap.docs
          .filter(d => {
             const u = d.data();
             return u.role === "staff" || u.subRole; // Be more inclusive
          })
          .map(d => ({ id: d.id, ...d.data() })),
        applications: aSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        attendance: attSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        announcements: annSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      });
      setAuditLogs(logSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a:any, b:any) => b.timestamp?.seconds - a.timestamp?.seconds));
      setNotifications(notifSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a:any, b:any) => b.createdAt?.seconds - a.createdAt?.seconds));
      toast.success("Command Hub synchronized with clinical cloud.");
    } catch (err: any) {
       if (err.code !== 'permission-denied') {
          handleFirestoreError(err, OperationType.LIST, "admin_sync");
       }
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileUpdate(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setLoading(true);
      const formData = new FormData(e.currentTarget);
      const updateData = {
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          age: formData.get("age"),
          staffId: formData.get("staffId"),
          avatarUrl: formData.get("avatarUrl"),
          updatedAt: serverTimestamp(),
      };

      try {
          await updateDoc(doc(db, "user_profiles", user!.uid), updateData);
          await fetchAdminData();
          setIsEditingProfile(false);
      } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, "user_profiles");
      } finally {
          setLoading(false);
      }
  }

  async function generatePatientUsername(fullName: string) {
    const initials = fullName
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 3);
    
    const counterRef = doc(db, "counters", "patient_id");
    let nextId = 1;
    
    try {
        const counterSnap = await getDoc(counterRef);
        if (counterSnap.exists()) {
            nextId = counterSnap.data().current + 1;
            await updateDoc(counterRef, { current: nextId });
        } else {
            await setDoc(counterRef, { current: 1 });
        }
    } catch (e) {
        nextId = Math.floor(Math.random() * 1000);
    }

    return `CL-${initials}-${nextId.toString().padStart(4, "0")}`;
  }

  async function updateAppStatus(appId: string, status: string, notes?: string) {
    setUpdatingApp(true);
    try {
      const updateData: any = { status, updatedAt: serverTimestamp() };
      if (notes) updateData.screeningNotes = notes;

      // Special logic for acceptance
      if (status === 'accepted') {
        if (selectedApp?.type === 'staff') {
          const username = await generateStaffUsername(selectedApp.role);
          const tempPassword = Math.random().toString(36).substring(2, 10).toUpperCase();
          const passwordHash = await hashPassword(tempPassword);

          updateData.identityId = username;

          await setDoc(doc(db, "credentials", username), {
              userId: appId,
              username,
              passwordHash,
              role: "staff",
              isTemporary: true,
              createdAt: serverTimestamp()
          });

          await setDoc(doc(db, "user_profiles", appId), {
              userId: appId,
              username,
              fullName: selectedApp.fullName,
              email: selectedApp.email,
              role: "staff",
              subRole: selectedApp.role,
              createdAt: serverTimestamp()
          }, { merge: true });
        } else if (selectedApp?.type === 'patient') {
          // If patient doesn't have an ID yet (from direct registration)
          if (!selectedApp.id || selectedApp.id.startsWith(appId)) { 
            const username = await generatePatientUsername(selectedApp.fullName);
            const tempPassword = Math.random().toString(36).substring(2, 10).toUpperCase();
            const passwordHash = await hashPassword(tempPassword);

            updateData.identityId = username;

            await setDoc(doc(db, "credentials", username), {
                userId: appId,
                username,
                passwordHash,
                role: "patient",
                isTemporary: true,
                createdAt: serverTimestamp()
            });

            await setDoc(doc(db, "user_profiles", appId), {
                userId: appId,
                username,
                fullName: selectedApp.fullName,
                email: selectedApp.email,
                role: "patient",
                createdAt: serverTimestamp()
            }, { merge: true });

            // Create patient record if it doesn't exist
            await setDoc(doc(db, "patients", appId), {
                id: appId,
                name: selectedApp.fullName,
                email: selectedApp.email,
                phone: selectedApp.phone || "",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });
          }
        }
      }

      await updateDoc(doc(db, "applications", appId), updateData);
      
      await logAdminAction(
        status === 'accepted' ? 'APPROVE_APPLICATION' : status === 'rejected' ? 'REJECT_APPLICATION' : 'UPDATE_APPLICATION_STATUS',
        appId,
        `Status set to ${status}. Notes: ${notes?.slice(0, 50) || 'None'}`
      );

      await fetchAdminData();
      if (selectedApp?.id === appId) {
        setSelectedApp({ ...selectedApp, ...updateData, updatedAt: new Date() });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "applications/" + appId);
    } finally {
      setUpdatingApp(false);
    }
  }

  async function scheduleInterview(appId: string, date: string, time: string, mode: "physical" | "virtual") {
    setUpdatingApp(true);
    try {
      const interviewToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const interview = {
        scheduledDate: new Date(`${date}T${time}`),
        mode,
        outcome: "pending",
        token: interviewToken
      };
      await updateDoc(doc(db, "applications", appId), {
        status: "interview",
        interview,
        updatedAt: serverTimestamp()
      });
      await logAdminAction("SCHEDULE_INTERVIEW", appId, `Interview scheduled for ${date} ${time} (${mode}). Secure Token Generated.`);
      await fetchAdminData();
      if (selectedApp?.id === appId) {
        setSelectedApp({ ...selectedApp, status: "interview", interview });
      }
      toast.success("Interview logic synchronized. Security token dispatched.");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "applications");
    } finally {
      setUpdatingApp(false);
    }
  }

  async function updatePatientAssignment(patientId: string, staffIds: string[]) {
    try {
      await updateDoc(doc(db, "patients", patientId), {
        assignedStaff: staffIds,
        updatedAt: serverTimestamp()
      });
      await logAdminAction("UPDATE_ASSIGNMENT", patientId, `Staff nodes updated: ${staffIds.join(', ')}`);
      await fetchAdminData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, "patients");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <ShieldCheck className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Initializing Command Hub...</p>
        </div>
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-12 rounded-[3.5rem] border border-border shadow-premium text-center"
        >
          <div className="h-20 w-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-100">
             <ShieldCheck className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight mb-4">Unauthorized Access</h1>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Your current security clearance does not allow entry to the Administrative Command Hub.
          </p>
          <Link to="/portal" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
             Return to Digital Gateway <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex selection:bg-primary/10">
      {/* Sidebar Navigation */}
      <aside className="w-80 bg-primary text-white flex flex-col p-8 sticky top-0 h-screen shrink-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
           <div className="absolute top-10 -left-10 w-64 h-64 bg-white rounded-full blur-[100px]" />
        </div>

        <Link to="/" className="flex items-center gap-3 mb-16 no-underline text-white relative group">
          <div className="bg-white/10 p-1.5 rounded-xl border border-white/20 group-hover:rotate-12 transition-transform">
            <PrimeVitaLogo className="h-10 w-10 brightness-0 invert" />
          </div>
          <div>
            <div className="font-display font-bold text-xl tracking-tight leading-none mb-1 italic serif text-white">PrimeVita</div>
            <div className="text-[7px] font-bold uppercase tracking-[0.4em] text-white/50">Admin Command</div>
          </div>
        </Link>

        <nav className="flex-1 space-y-2 relative">
          <SidebarNavBtn active={view === "overview"} onClick={() => setView("overview")} icon={LayoutDashboard} label="Control Panel" />
          <SidebarNavBtn active={view === "staff"} onClick={() => setView("staff")} icon={ClipboardList} label="Staff Directory" />
          <SidebarNavBtn active={view === "attendance"} onClick={() => setView("attendance")} icon={CalendarCheck} label="Attendance Log" />
          <SidebarNavBtn active={view === "patients"} onClick={() => setView("patients")} icon={Users} label="Patient Registry" />
          <SidebarNavBtn active={view === "finance"} onClick={() => setView("finance")} icon={Wallet} label="Financial Ops" />
          <SidebarNavBtn active={view === "announcements"} onClick={() => setView("announcements")} icon={Megaphone} label="Communications" />
          <SidebarNavBtn active={view === "applications"} onClick={() => setView("applications")} icon={UserPlus} label="Recruitment" />
          <SidebarNavBtn active={view === "audit"} onClick={() => setView("audit")} icon={Database} label="Audit System" />
          
          <div className="pt-4 mt-4 border-t border-white/5">
            <button 
              onClick={() => {
                auth.signOut().then(() => navigate({ to: "/portal/auth" }));
              }}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] transition-all text-white/40 hover:text-rose-400 hover:bg-rose-400/5"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-[13.5px] font-bold tracking-tight">Deactivate Session</span>
            </button>
          </div>
        </nav>
        <div className="pt-10 border-t border-white/10 relative">
          <button 
            onClick={() => {
              setView("overview");
              setIsEditingProfile(true);
            }}
            className="w-full flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 hover:bg-white/10 transition-all text-left"
          >
            <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xs">
               {profile.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
               <div className="text-[13px] font-bold truncate">{profile.fullName}</div>
               <div className="text-[10px] font-bold uppercase tracking-widest text-white/40">Root Admin</div>
            </div>
            <ChevronRight className="h-4 w-4 text-white/20" />
          </button>
        </div>
      </aside>

      {/* Main Command Area */}
      <main className="flex-1 overflow-x-hidden">
        {/* Top Hub Bar */}
        <header className="h-24 bg-white border-b border-border px-12 flex items-center justify-between sticky top-0 z-20 shadow-sm backdrop-blur-md bg-white/80">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-primary tracking-tight capitalize">{view} Tracking</h1>
            <div className="h-6 w-px bg-border mx-2" />
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              <Activity className="h-3 w-3 text-emerald-500 animate-pulse" /> Live Server 1
            </div>
          </div>

          <div className="flex items-center gap-6">
             <button 
               onClick={fetchAdminData}
               className="h-12 px-6 rounded-2xl bg-secondary border border-border text-[11px] font-bold uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
             >
               <Activity className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Sync Nodes
             </button>
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Query infrastructure..." 
                  className="pl-11 pr-6 py-3 bg-secondary/50 rounded-2xl border border-border text-[13px] outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 w-80 font-medium transition-all" 
                />
             </div>
             <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="h-12 w-12 rounded-2xl border border-border flex items-center justify-center hover:bg-secondary transition-colors relative"
                >
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    {notifications.filter(n => !n.read).length > 0 && (
                        <div className="absolute top-2.5 right-2.5 h-2 w-2 bg-rose-500 rounded-full animate-ping" />
                    )}
                </button>
                <AnimatePresence>
                    {showNotifications && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-4 w-96 bg-white border border-border rounded-[2rem] shadow-premium z-50 overflow-hidden"
                        >
                            <div className="p-6 border-b border-border bg-slate-50 flex items-center justify-between">
                                <h4 className="text-[11px] font-bold uppercase tracking-widest text-primary">Clinical Alerts</h4>
                                <span className="text-[10px] font-bold text-indigo-600">{notifications.filter(n => !n.read).length} Unread</span>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map((n:any) => (
                                        <div key={n.id} className={`p-6 border-b border-border hover:bg-slate-50 transition-colors cursor-pointer ${n.read ? 'opacity-60' : ''}`}>
                                            <div className="flex gap-4">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'application' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    <Activity className="h-4 w-4" />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-[13px] font-bold text-primary">{n.title}</div>
                                                    <p className="text-[11px] text-muted-foreground leading-relaxed">{n.message}</p>
                                                    <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                                                        {new Date(n.createdAt?.seconds * 1000).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-12 text-center text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                                        No recent clinical events.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
             </div>
             <button className="h-12 px-6 rounded-2xl bg-primary text-white text-[13px] font-bold shadow-premium hover:bg-primary/95 transition-all flex items-center gap-2">
                <Download className="h-4 w-4" /> Export
             </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="p-12 max-w-[1600px] mx-auto">
          <AnimatePresence mode="wait">
            {view === "overview" && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {isEditingProfile ? (
                   <div className="bg-white rounded-[3.5rem] p-12 border border-border shadow-premium max-w-4xl mx-auto">
                      <div className="flex items-center justify-between mb-10">
                        <h2 className="text-3xl font-bold text-primary italic serif">Root Administrative Profile</h2>
                        <button onClick={() => setIsEditingProfile(false)} className="h-10 w-10 rounded-full bg-secondary grid place-items-center"><X className="h-4 w-4" /></button>
                      </div>
                      <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="md:col-span-2 flex items-center gap-8 mb-4">
                            <div className="h-24 w-24 rounded-[2rem] bg-secondary border border-border overflow-hidden">
                               <img src={profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} alt="Profile" className="h-full w-full object-cover" />
                            </div>
                            <div className="space-y-4 flex-1">
                               <EMRInput label="Profile Image URL" name="avatarUrl" defaultValue={profile.avatarUrl} placeholder="Passport photo link" />
                            </div>
                         </div>
                         <EMRInput label="Full Legal Name" name="fullName" defaultValue={profile.fullName} required />
                         <EMRInput label="Primary Email" name="email" defaultValue={profile.email} required />
                         <EMRInput label="Administrative ID" name="staffId" defaultValue={profile.staffId} placeholder="ADM-001" />
                         <EMRInput label="Contact Phone" name="phone" defaultValue={profile.phone} placeholder="+1 555-PRIV" />
                         <EMRInput label="Age" name="age" type="number" defaultValue={profile.age} />
                         <div className="md:col-span-2 pt-6">
                            <button type="submit" disabled={loading} className="w-full py-5 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-premium">
                               {loading ? "Decrypting Sync..." : "Confirm Security Credentials"}
                            </button>
                         </div>
                      </form>
                   </div>
                ) : (
                  <>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                      <AdminStatCard label="Active Patients" value={data.patients.length} icon={Users} trend="Direct Sync" color="text-indigo-600" bg="bg-indigo-50" />
                      <AdminStatCard label="Active Medical Nodes" value={data.staff.length} icon={Stethoscope} trend="Verified" color="text-emerald-600" bg="bg-emerald-50" />
                      <AdminStatCard label="Pending Apps" value={data.applications.filter((a:any) => a.status === 'pending').length} icon={UserPlus} trend="High Priority" color="text-amber-600" bg="bg-amber-50" />
                      <AdminStatCard label="Scheduled Interviews" value={data.applications.filter((a:any) => a.status === 'interview').length} icon={CalendarCheck} trend="Today/Upcoming" color="text-blue-600" bg="bg-blue-50" />
                      
                      <AdminStatCard label="Staff Present" value={data.attendance.filter((att:any) => {
                         const today = new Date().toISOString().split('T')[0];
                         return att.date === today;
                      }).length} icon={Check} trend="Active Today" color="text-emerald-700" bg="bg-emerald-50/50" />
                      
                      <AdminStatCard label="Staff Absent" value={data.staff.length - data.attendance.filter((att:any) => {
                         const today = new Date().toISOString().split('T')[0];
                         return att.date === today;
                      }).length} icon={X} trend="Auto-Logic" color="text-rose-600" bg="bg-rose-50" />
                      
                      <AdminStatCard label="Pending Payments" value={data.patients.filter((p:any) => p.billing?.status === 'pending' || p.billing?.status === 'overdue').length} icon={Wallet} trend="Revenue Risk" color="text-amber-700" bg="bg-amber-50" />
                      <AdminStatCard label="System Uptime" value="100%" icon={Activity} trend="Operational" color="text-indigo-700" bg="bg-indigo-50" />
                    </div>

                    <div className="grid lg:grid-cols-[1fr_400px] gap-8">
                       <div className="space-y-8">
                          <div className="bg-white rounded-[3rem] p-10 border border-border shadow-clinical">
                             <div className="flex items-center justify-between mb-10">
                                <h3 className="text-xl font-bold text-primary tracking-tight">System Infrastructure Summary</h3>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Global Health 100%</span>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                <OverviewSmallStat label="Departments" val={8} />
                                <OverviewSmallStat label="Clinical Nodes" val={data.staff.length} />
                                <OverviewSmallStat label="Avg. Response" val="4.2m" />
                                <OverviewSmallStat label="Uptime" val="99.9%" />
                             </div>
                          </div>

                          <div className="bg-white rounded-[3rem] p-10 border border-border shadow-clinical">
                             <h3 className="text-xl font-bold text-primary tracking-tight mb-8 font-display italic serif">Command Directives</h3>
                             <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setView("applications")} className="flex items-center gap-4 p-5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all group lg:min-h-[100px]">
                                   <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/50 group-hover:bg-white/20"><UserPlus className="h-5 w-5 group-hover:rotate-6" /></div>
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-left">Review Applications</span>
                                </button>
                                <button onClick={() => setView("patients")} className="flex items-center gap-4 p-5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all group lg:min-h-[100px]">
                                   <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/50 group-hover:bg-white/20"><Users className="h-5 w-5 group-hover:rotate-6" /></div>
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-left">Assign Patients</span>
                                </button>
                                <button onClick={() => setView("finance")} className="flex items-center gap-4 p-5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 hover:bg-amber-600 hover:text-white transition-all group lg:min-h-[100px]">
                                   <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/50 group-hover:bg-white/20"><Wallet className="h-5 w-5 group-hover:rotate-6" /></div>
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-left">Internal Billing</span>
                                </button>
                                <button onClick={() => setView("attendance")} className="flex items-center gap-4 p-5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all group lg:min-h-[100px]">
                                   <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/50 group-hover:bg-white/20"><CalendarCheck className="h-5 w-5 group-hover:rotate-6" /></div>
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-left">Attendance Core</span>
                                </button>
                             </div>
                          </div>

                          <div className="bg-white rounded-[3rem] p-10 border border-border shadow-clinical">
                             <div className="flex items-center justify-between mb-10">
                                <h3 className="text-xl font-bold text-primary tracking-tight">Real-Time Security Feed</h3>
                                <button className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">Auditor View</button>
                             </div>
                             <div className="space-y-6">
                                {data.applications.slice(0, 3).map((app:any) => (
                                  <div key={`feed-app-${app.id}`} className="flex items-center gap-6 p-4 rounded-3xl border border-transparent hover:border-border hover:bg-secondary/30 transition-all">
                                     <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><UserPlus className="h-5 w-5" /></div>
                                     <div className="flex-1">
                                        <div className="text-[15px] font-bold text-primary">New Pipeline Entry</div>
                                        <div className="text-xs text-muted-foreground">{app.fullName} applied for {app.specialization || app.role}</div>
                                     </div>
                                     <time className="text-[11px] font-bold text-muted-foreground/30 uppercase tracking-widest">Just now</time>
                                  </div>
                                ))}
                                {data.attendance.slice(0, 3).map((att:any) => (
                                  <div key={`feed-att-${att.id}`} className="flex items-center gap-6 p-4 rounded-3xl border border-transparent hover:border-border hover:bg-secondary/30 transition-all">
                                     <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Check className="h-5 w-5" /></div>
                                     <div className="flex-1">
                                        <div className="text-[15px] font-bold text-primary">Attendance Logic Match</div>
                                        <div className="text-xs text-muted-foreground">Staff Node {att.staffId?.slice(0, 8)} verified for today.</div>
                                     </div>
                                     <time className="text-[11px] font-bold text-muted-foreground/30 uppercase tracking-widest">Today</time>
                                  </div>
                                ))}
                             </div>
                          </div>
                       </div>

                       <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-premium relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-8 opacity-10"><Database className="h-32 w-32" /></div>
                          <h3 className="text-xl font-bold tracking-tight mb-8 relative z-10 italic serif">Admin Biodata Hub</h3>
                          <div className="space-y-8 relative z-10">
                             <div className="flex items-center gap-6">
                                <div className="h-16 w-16 rounded-3xl border-2 border-white/20 overflow-hidden shadow-glow">
                                   <img src={profile.avatarUrl} alt="Root" className="h-full w-full object-cover" />
                                </div>
                                <div>
                                   <div className="font-bold text-lg">{profile.fullName}</div>
                                   <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{profile.email}</div>
                                </div>
                             </div>
                             
                             <div className="space-y-4 pt-8 border-t border-white/5">
                                <div className="flex items-center justify-between">
                                   <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Employee ID</span>
                                   <span className="text-sm font-bold">{profile.staffId || "ROOT-ACCESS"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                   <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Phone</span>
                                   <span className="text-sm font-bold">{profile.phone || "Restricted"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                   <span className="text-[11px] font-bold uppercase tracking-widest text-white/30">Security Clearance</span>
                                   <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-bold">Level 5 (Admin)</span>
                                </div>
                             </div>

                             <button 
                                onClick={() => setIsEditingProfile(true)}
                                className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/10 transition-all font-bold text-xs uppercase tracking-widest mt-4"
                             >
                                Edit System Biodata
                             </button>
                          </div>
                          
                          <div className="mt-12 p-6 bg-white/5 rounded-[2rem] border border-white/10">
                             <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Last Access Log</div>
                             <div className="text-xs font-medium text-white/60">Verified via RSA-4096 on {new Date().toLocaleDateString()}</div>
                          </div>
                       </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {view === "applications" && (
              <div className="space-y-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[3.5rem] border border-border shadow-clinical overflow-hidden"
                >
                  <div className="p-10 border-b border-border flex items-center justify-between bg-white sticky top-0 z-10">
                     <div>
                        <h3 className="text-2xl font-bold text-primary tracking-tight font-display">Recruitment Command Center</h3>
                        <p className="text-sm text-muted-foreground font-medium">Verify credentials and manage phone screening for clinical candidates.</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="flex -space-x-3">
                           {data.applications.slice(0, 5).map((a: any, i: number) => (
                              <div key={`av-head-${a.id}`} className="h-10 w-10 rounded-full border-2 border-white bg-secondary flex items-center justify-center text-[10px] font-bold text-primary shadow-sm">
                                 {a.fullName.charAt(0)}
                              </div>
                           ))}
                           {data.applications.length > 5 && (
                              <div className="h-10 w-10 rounded-full border-2 border-white bg-primary text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                                 +{data.applications.length - 5}
                              </div>
                           )}
                        </div>
                        <div className="h-10 w-px bg-border mx-2" />
                        <div className="text-right">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">Active Stage</div>
                           <div className="text-xs font-bold text-primary">Phone Screening</div>
                        </div>
                     </div>
                  </div>
                  
                  <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left">
                      <thead className="bg-[#F8FAFC] text-[10px] font-bold uppercase text-muted-foreground/60 tracking-[0.4em] border-b border-border">
                        <tr>
                          <th className="px-10 py-6">Applicant Node</th>
                          <th className="px-10 py-6">Specialization</th>
                          <th className="px-10 py-6">Recruitment Phase</th>
                          <th className="px-10 py-6 text-right">Decision Engine</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.applications.map((app: any) => (
                          <tr key={`app-tbl-${app.id}`} 
                            onClick={() => {
                              setSelectedApp(app);
                              setScreeningNotes(app.screeningNotes || "");
                            }}
                            className="group hover:bg-secondary/20 transition-all duration-300 cursor-pointer"
                          >
                            <td className="px-10 py-8">
                              <div className="flex items-center gap-5">
                                 <div className="h-14 w-14 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl group-hover:scale-105 transition-transform">
                                    {app.fullName.charAt(0)}
                                 </div>
                                 <div>
                                    <div className="font-bold text-[16px] text-primary group-hover:text-indigo-600 transition-colors italic serif">{app.fullName}</div>
                                    <div className="text-xs text-muted-foreground font-medium">{app.email} • {app.type === 'staff' ? 'Clinical Entry' : 'Patient Admission'}</div>
                                 </div>
                              </div>
                            </td>
                            <td className="px-10 py-8">
                               <div className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-2xl border border-slate-200 uppercase tracking-widest group-hover:bg-white transition-colors">
                                  <Stethoscope className="h-3.5 w-3.5 opacity-50" /> {app.role || app.specialization || "Clinical"}
                               </div>
                            </td>
                            <td className="px-10 py-8">
                              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest ${
                                app.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                                app.status === 'screening' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                app.status === 'accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                'bg-rose-50 text-rose-600 border border-rose-100'
                              }`}>
                                 <div className={`h-1.5 w-1.5 rounded-full ${
                                    app.status === 'pending' ? 'bg-amber-600 animate-pulse' : 
                                    app.status === 'screening' ? 'bg-blue-600 animate-pulse' :
                                    app.status === 'accepted' ? 'bg-emerald-600' : 'bg-rose-600'
                                 }`} />
                                 {app.status === 'screening' ? 'Phone Screening' : app.status}
                              </div>
                            </td>
                            <td className="px-10 py-8 text-right">
                              <button className="h-12 w-12 border border-border rounded-2xl flex items-center justify-center hover:bg-white hover:text-primary transition-all group-hover:shadow-soft">
                                 <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {data.applications.length === 0 && (
                          <tr>
                             <td colSpan={4} className="px-10 py-32 text-center">
                                <UserPlus className="h-16 w-16 text-muted-foreground/20 mx-auto mb-6" />
                                <p className="text-muted-foreground font-medium italic">No pending applications in the pipeline.</p>
                             </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>

                {/* Application Detail Overly Sidebar */}
                <AnimatePresence>
                  {selectedApp && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedApp(null)}
                        className="fixed inset-0 bg-primary/20 backdrop-blur-md z-[100]"
                      />
                      <motion.div 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        className="fixed top-0 right-0 h-screen w-full max-w-2xl bg-white shadow-2xl z-[101] overflow-y-auto"
                      >
                         <div className="p-12 space-y-12">
                            <div className="flex items-center justify-between">
                               <button 
                                 onClick={() => setSelectedApp(null)}
                                 className="h-12 w-12 rounded-2xl border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                               >
                                  <X className="h-5 w-5" />
                               </button>
                               <div className="flex items-center gap-3">
                                  <div className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest ${
                                    selectedApp.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                                    selectedApp.status === 'screening' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                    selectedApp.status === 'accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                    'bg-rose-50 text-rose-600 border border-rose-100'
                                  }`}>
                                     {selectedApp.status}
                                  </div>
                                  <button className="h-12 w-12 rounded-2xl border border-border flex items-center justify-center hover:bg-secondary">
                                      <MoreHorizontal className="h-5 w-5" />
                                  </button>
                               </div>
                            </div>

                            <div className="flex flex-col items-center text-center">
                               <div className="h-32 w-32 rounded-[2.5rem] bg-secondary border border-border text-primary flex items-center justify-center text-5xl font-bold mb-8 italic serif">
                                  {selectedApp.fullName.charAt(0)}
                               </div>
                               <h2 className="text-4xl font-bold text-primary tracking-tight italic serif mb-2">{selectedApp.fullName}</h2>
                               <p className="text-muted-foreground font-medium flex items-center gap-2">
                                  <Stethoscope className="h-4 w-4" /> {selectedApp.type === 'staff' ? 'Clinical Staff' : 'Patient Admission'} Registration
                               </p>
                            </div>

                            <div className="grid grid-cols-2 gap-6 pb-12 border-b border-border">
                               <div className="p-6 bg-secondary/30 rounded-3xl border border-border">
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50 mb-1">Email Address</div>
                                  <div className="font-bold text-primary text-[15px]">{selectedApp.email}</div>
                               </div>
                               <div className="p-6 bg-secondary/30 rounded-3xl border border-border">
                                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50 mb-1">Phone Number</div>
                                  <div className="font-bold text-primary text-[15px]">{selectedApp.phone || "N/A"}</div>
                               </div>
                            </div>

                            {/* New Structured Data Display */}
                            {selectedApp.type === 'staff' && (
                                <div className="space-y-6 pt-12 border-t border-border">
                                    <h3 className="text-base font-bold text-primary tracking-tight flex items-center gap-2">
                                        <Briefcase className="h-4 w-4 text-emerald-500" /> Professional & Academic Registry
                                    </h3>
                                    <div className="grid gap-6">
                                        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-border space-y-4">
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Clinical Experience</div>
                                            <div className="space-y-2">
                                                <div className="text-lg font-bold text-primary italic serif">{selectedApp.role} • {selectedApp.qualification}</div>
                                                <div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                                    <Clock className="h-3 w-3" /> {selectedApp.experienceYears} Years Experience
                                                </div>
                                                <div className="text-xs font-medium text-muted-foreground">Previous: {selectedApp.previousWorkplace}</div>
                                            </div>
                                        </div>

                                        {selectedApp.education && (
                                            <div className="p-8 bg-indigo-50/30 rounded-[2.5rem] border border-indigo-100/50 space-y-4">
                                                <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest border-b border-indigo-100/50 pb-2">Academic Credentials</div>
                                                <div className="space-y-1">
                                                    <div className="text-lg font-bold text-primary italic serif">{selectedApp.education.qualification}</div>
                                                    <div className="text-xs font-medium text-muted-foreground">{selectedApp.education.school} • Class of {selectedApp.education.graduationYear}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedApp.type === 'patient' && selectedApp.emergencyContacts?.length > 0 && (
                                <div className="space-y-6 pt-12 border-t border-border">
                                    <h3 className="text-base font-bold text-primary tracking-tight flex items-center gap-2">
                                        <ShieldAlert className="h-4 w-4 text-rose-500" /> Emergency Contact Base
                                    </h3>
                                    <div className="grid gap-4">
                                        {selectedApp.emergencyContacts.map((contact: any, i: number) => (
                                             <div key={`contact-${i}`} className="p-8 bg-rose-50/30 rounded-[2.5rem] border border-rose-100/50 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-rose-600 uppercase tracking-widest">{contact.relationship} Node</span>
                                                    <span className="text-[9px] font-bold uppercase text-muted-foreground/60">{contact.idType}: {contact.idNumber}</span>
                                                </div>
                                                <div className="text-lg font-bold text-primary italic serif">{contact.fullName}</div>
                                                <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                                                    <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3 w-3" /> {contact.phone}</div>
                                                    <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3 w-3" /> {contact.email || "No Email"}</div>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground/80 leading-relaxed font-medium">
                                                    <MapPin className="inline h-3 w-3 mr-1" /> {contact.address}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedApp.type === 'staff' && (selectedApp.guarantors?.length > 0 || selectedApp.guarantor) && (
                                <div className="space-y-6 pt-12 border-t border-border">
                                    <h3 className="text-base font-bold text-primary tracking-tight flex items-center gap-2">
                                        <Landmark className="h-4 w-4 text-indigo-500" /> Administrative Guarantor Registry
                                    </h3>
                                    <div className="grid gap-4">
                                        {/* Handle both array (legacy/patient-like) and single object (current staff flow) */}
                                        {selectedApp.guarantors?.map((g: any, i: number) => (
                                            <GuarantorCard key={`guarantor-${i}`} g={g} />
                                        ))}
                                        {selectedApp.guarantor && <GuarantorCard key="primary-guarantor" g={selectedApp.guarantor} />}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6">
                               <h3 className="text-base font-bold text-primary tracking-tight flex items-center gap-2 underline decoration-indigo-500/30 underline-offset-8">
                                  <Phone className="h-4 w-4" /> Comprehensive Recruitment Matrix
                               </h3>
                               <p className="text-sm text-muted-foreground leading-relaxed">
                                  Use this workspace to log candidate technical proficiency, behavioral alignment, and clinical reasoning during the initial phone screen.
                               </p>
                               
                               <div className="space-y-4">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Screening Evaluation Notes</label>
                                  <textarea 
                                    className="w-full bg-secondary/20 border border-border p-6 rounded-3xl text-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30 transition-all min-h-[150px] font-medium resize-none"
                                    placeholder="Assess clinical competence, communication clarity, and situational judgment..."
                                    value={screeningNotes}
                                    onChange={(e) => setScreeningNotes(e.target.value)}
                                  />
                               </div>

                               <div className="flex gap-4">
                                  <button 
                                    disabled={updatingApp || selectedApp.status === 'screening'}
                                    onClick={() => updateAppStatus(selectedApp.id, 'screening', screeningNotes)}
                                    className="flex-1 py-5 rounded-2xl border border-blue-200 text-blue-600 font-bold text-xs uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                  >
                                     <Clock className="h-4 w-4" /> {selectedApp.status === 'screening' ? 'In Screening' : 'Move to Screening'}
                                  </button>
                                  <button 
                                    disabled={updatingApp}
                                    onClick={() => updateAppStatus(selectedApp.id, selectedApp.status, screeningNotes)}
                                    className="py-5 px-8 rounded-2xl bg-secondary text-primary font-bold text-xs uppercase tracking-widest hover:bg-white border border-border shadow-sm transition-all flex items-center justify-center gap-2"
                                  >
                                     <FileText className="h-4 w-4" /> Save Eval
                                  </button>
                               </div>
                            </div>

                            {selectedApp.type === 'staff' && (
                                <div className="mt-8 p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-6 shadow-premium">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Interview Scheduling Node</h4>
                                        <CalendarCheck className="h-5 w-5 text-indigo-400" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold uppercase text-slate-500">Scheduled Date</label>
                                            <input id="int-date" type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold uppercase text-slate-500">Scheduled Time</label>
                                            <input id="int-time" type="time" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <select id="int-mode" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest outline-none flex-1">
                                            <option value="virtual">Virtual Session</option>
                                            <option value="physical">Physical Facility</option>
                                        </select>
                                        <button 
                                            onClick={() => {
                                                const date = (document.getElementById('int-date') as HTMLInputElement).value;
                                                const time = (document.getElementById('int-time') as HTMLInputElement).value;
                                                const mode = (document.getElementById('int-mode') as HTMLSelectElement).value as any;
                                                if (date && time) scheduleInterview(selectedApp.id, date, time, mode);
                                            }}
                                            className="px-6 py-4 bg-indigo-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-glow"
                                        >
                                            Invite Candidate
                                        </button>
                                    </div>
                                    {selectedApp.interview && (
                                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Active Schedule: {new Date(selectedApp.interview.scheduledDate.seconds * 1000).toLocaleString()}</span>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{selectedApp.interview.mode}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-4 pt-12 border-t border-border">
                               <button 
                                 disabled={updatingApp || selectedApp.status === 'accepted'}
                                 onClick={() => updateAppStatus(selectedApp.id, 'accepted', screeningNotes)}
                                 className="flex-1 py-6 bg-emerald-600 text-white rounded-3xl font-bold text-xs uppercase tracking-widest shadow-premium hover:shadow-glow transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                               >
                                  <Check className="h-5 w-5" /> {selectedApp.type === 'staff' ? 'Authorize Hire' : 'Authorize Admission'}
                               </button>
                               <button 
                                 disabled={updatingApp || selectedApp.status === 'rejected'}
                                 onClick={() => updateAppStatus(selectedApp.id, 'rejected', screeningNotes)}
                                 className="flex-1 py-6 border border-rose-100 text-rose-600 rounded-3xl font-bold text-xs uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                               >
                                  <X className="h-5 w-5" /> {selectedApp.type === 'staff' ? 'Decline Node' : 'Reject Admission'}
                               </button>
                            </div>
                         </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            {view === "patients" && (
                <motion.div 
                    key="patients"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="bg-white rounded-[3.5rem] border border-border shadow-clinical overflow-hidden">
                        <div className="p-10 border-b border-border flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-bold text-primary tracking-tight font-display italic serif">Patient Assignment Hub</h3>
                                <p className="text-sm text-muted-foreground font-medium">Control clinician access and case distribution.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="bg-primary text-white px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Users className="h-3 w-3" /> {data.patients.length} Registered Caseloads
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#F8FAFC] text-[10px] font-bold uppercase text-muted-foreground/60 tracking-[0.4em] border-b border-border">
                                    <tr>
                                        <th className="px-10 py-6">Patient Identifier</th>
                                        <th className="px-10 py-6">Primary Condition</th>
                                        <th className="px-10 py-6">Assigned Medical Node</th>
                                        <th className="px-10 py-6 text-right">Case Authorization</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data.patients.map((p:any) => (
                                        <tr key={`patient-row-${p.id}`} className="hover:bg-secondary/20 transition-all">
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-5">
                                                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 italic serif">
                                                        {p.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-primary italic serif">{p.name}</div>
                                                        <div className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">UID: {p.id.slice(0, 8)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-xs font-bold text-muted-foreground">
                                                {p.condition || "Observation Required"}
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                                    <span className="text-xs font-bold text-primary">
                                                      {p.assignedStaff?.length > 0 ? `${p.assignedStaff.length} Clinicians` : "Unassigned"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <button className="px-6 py-2 bg-secondary text-primary rounded-xl text-[10px] font-bold uppercase tracking-widest border border-border hover:bg-white transition-all shadow-sm">
                                                    Configure Access
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            )}

            {view === "finance" && (
                <motion.div 
                    key="finance"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <AdminStatCard label="Overdue Invoices" value={data.patients.filter((p:any) => p.billing?.status === 'overdue').length} icon={AlertCircle} trend="Requires Action" color="text-rose-600" bg="bg-rose-50" />
                       <AdminStatCard label="Pending Settlements" value={data.patients.filter((p:any) => p.billing?.status === 'pending').length} icon={Clock} trend="In Progress" color="text-amber-600" bg="bg-amber-50" />
                       <AdminStatCard label="Active Accounts" value={data.patients.length} icon={Check} trend="Health Optimal" color="text-emerald-600" bg="bg-emerald-50" />
                    </div>

                    <div className="bg-white rounded-[3.5rem] border border-border shadow-clinical overflow-hidden">
                        <div className="p-10 border-b border-border flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-primary tracking-tight font-display italic serif">Revenue Operation Console</h3>
                            <div className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-bold uppercase tracking-widest">
                               HIPAA Secure Billing System
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#F8FAFC] text-[10px] font-bold uppercase text-muted-foreground/60 tracking-[0.4em] border-b border-border">
                                    <tr>
                                        <th className="px-10 py-6">Patient Entity</th>
                                        <th className="px-10 py-6">Balance Due</th>
                                        <th className="px-10 py-6">Lifecycle Status</th>
                                        <th className="px-10 py-6 text-right">Payment Notification</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data.patients.map((p:any) => (
                                        <tr key={`finance-row-${p.id}`}>
                                            <td className="px-10 py-8 font-bold text-primary">{p.name}</td>
                                            <td className="px-10 py-8 font-mono text-sm font-bold text-slate-600">
                                                ${(p.billing?.balanceDue || 0).toLocaleString()}
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className={`px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                                                    p.billing?.status === 'overdue' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                    p.billing?.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                }`}>
                                                    {p.billing?.status || "In-Cycle"}
                                                </span>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <button className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-primary hover:text-white transition-all ml-auto">
                                                    <Megaphone className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            )}

            {view === "announcements" && (
                <motion.div 
                    key="announcements"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid lg:grid-cols-[450px_1fr] gap-8"
                >
                    <div className="bg-white rounded-[3.5rem] p-10 border border-border shadow-clinical">
                        <h3 className="text-xl font-bold text-primary tracking-tight mb-8">Broadcast Center</h3>
                        <form className="space-y-6">
                            <EMRInput label="Notification Title" name="title" placeholder="System Maintenance..." />
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Message Payload</label>
                                <textarea className="w-full bg-[#F8FAFC] border border-border rounded-2xl px-5 py-4 text-sm font-bold outline-none h-40 resize-none focus:ring-4 focus:ring-primary/5" placeholder="Operational alert body..."></textarea>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Target Network</label>
                                <select className="w-full bg-[#F8FAFC] border border-border rounded-2xl px-5 py-4 text-sm font-bold outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-primary/5">
                                    <option>Global (All Nodes)</option>
                                    <option>Internal Medical Corps (Staff Only)</option>
                                    <option>Patient Registry (Patients Only)</option>
                                    <option>Targeted Deployment</option>
                                </select>
                            </div>
                            <button className="w-full py-5 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-premium flex items-center justify-center gap-3">
                                <Megaphone className="h-4 w-4" /> Execute Broadcast
                            </button>
                        </form>
                    </div>

                    <div className="bg-white rounded-[3.5rem] border border-border shadow-clinical overflow-hidden">
                        <div className="p-10 border-b border-border">
                            <h3 className="text-xl font-bold text-primary tracking-tight">Transmission History</h3>
                        </div>
                        <div className="p-10 space-y-6">
                            {data.announcements.map((ann:any) => (
                                <div key={`ann-${ann.id}`} className="p-8 bg-[#F8FAFC] rounded-[2.5rem] border border-border group hover:bg-white transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-100">{ann.target}</div>
                                        <time className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">{new Date(ann.createdAt?.seconds * 1000).toLocaleDateString()}</time>
                                    </div>
                                    <h4 className="text-lg font-bold text-primary mb-2 italic serif">{ann.title}</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{ann.message}</p>
                                </div>
                            ))}
                            {data.announcements.length === 0 && (
                                <div className="text-center py-20">
                                    <MessageSquare className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                                    <p className="text-muted-foreground italic">No historical broadcasts recorded.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
            {view === "staff" && (
              <motion.div 
                key="staff"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                 <div className="bg-white rounded-[3.5rem] border border-border shadow-clinical overflow-hidden">
                    <div className="p-10 border-b border-border flex items-center justify-between">
                       <div>
                          <h3 className="text-2xl font-bold text-primary tracking-tight font-display italic serif">Medical Corps Registry</h3>
                          <p className="text-sm text-muted-foreground font-medium">Manage and monitor all authorized healthcare professionals.</p>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                             <Stethoscope className="h-3 w-3" /> {data.staff.length} Active Nodes
                          </div>
                       </div>
                    </div>
                    <div className="overflow-x-auto">
                       <table className="w-full text-left">
                          <thead className="bg-[#F8FAFC] text-[10px] font-bold uppercase text-muted-foreground/60 tracking-[0.4em] border-b border-border">
                             <tr>
                                <th className="px-10 py-6">Professional</th>
                                <th className="px-10 py-6">Node ID</th>
                                <th className="px-10 py-6">Department</th>
                                <th className="px-10 py-6 text-right">Operational Status</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                             {data.staff.filter((s:any) => s.fullName.toLowerCase().includes(searchQuery.toLowerCase())).map((staff:any) => (
                               <tr 
                                 key={`staff-node-${staff.id}`} 
                                 onClick={() => setSelectedStaff(staff)}
                                 className="hover:bg-indigo-50/30 transition-all cursor-pointer group"
                               >
                                  <td className="px-10 py-8">
                                     <div className="flex items-center gap-5">
                                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 overflow-hidden shadow-soft">
                                           <img src={staff.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${staff.id}`} className="h-full w-full object-cover" />
                                        </div>
                                        <div>
                                           <div className="font-bold text-primary italic serif">{staff.fullName}</div>
                                           <div className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest">{staff.email}</div>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-10 py-8">
                                     <span className="font-mono text-[11px] font-bold text-slate-500 uppercase">{staff.staffId || "EXT-NODE"}</span>
                                  </td>
                                  <td className="px-10 py-8">
                                     <span className="text-xs font-bold text-primary/60">{staff.department || "General Ward"}</span>
                                  </td>
                                  <td className="px-10 py-8 text-right">
                                     <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase tracking-widest">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                        Inbound Sync Active
                                     </div>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </motion.div>
            )}

            {view === "attendance" && (
              <motion.div 
                key="attendance"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                 <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-premium relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-10"><Activity className="h-40 w-40" /></div>
                    <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                       <div>
                          <h3 className="text-3xl font-bold tracking-tight mb-4 italic serif">Record of Service: Workforce Analytics</h3>
                          <p className="text-white/60 font-medium leading-relaxed max-w-md">Automated operational synchronization for compliance and efficiency benchmarking. Distributed node tracking for the current clinical cycle.</p>
                       </div>
                       <div className="flex flex-wrap gap-4">
                          <button className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-glow hover:scale-105 transition-all flex items-center gap-2">
                             <Download className="h-4 w-4" /> Export Registry Load
                          </button>
                          <button className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs uppercase tracking-widest border border-white/10 flex items-center gap-2">
                             <FileText className="h-4 w-4" /> Deep Audit
                          </button>
                       </div>
                    </div>
                 </div>

                 <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-border shadow-clinical">
                       <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">Aggregate Presence</h4>
                       <div className="text-5xl font-bold text-primary tracking-tighter mb-2">94<span className="text-2xl opacity-20">%</span></div>
                       <p className="text-[10px] font-medium text-emerald-600">Above clinical baseline (92%)</p>
                    </div>
                    <div className="bg-white p-10 rounded-[2.5rem] border border-border shadow-clinical">
                       <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">Flagged Absences</h4>
                       <div className="text-5xl font-bold text-rose-500 tracking-tighter mb-2">02</div>
                       <p className="text-[10px] font-medium text-muted-foreground">Automatic logs for yesterday</p>
                    </div>
                    <div className="bg-white p-10 rounded-[2.5rem] border border-border shadow-clinical">
                       <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">Login Analytics</h4>
                       <div className="text-5xl font-bold text-blue-600 tracking-tighter mb-2">{data.attendance.length}</div>
                       <p className="text-[10px] font-medium text-muted-foreground">Successful node handshakes today</p>
                    </div>
                 </div>

                 <div className="bg-white rounded-[3.5rem] border border-border shadow-clinical overflow-hidden">
                    <div className="p-10 border-b border-border">
                       <h3 className="text-2xl font-bold text-primary tracking-tight font-display italic serif">Real-Time Attendance Logic</h3>
                       <p className="text-sm text-muted-foreground font-medium">Automatic verification based on clinical documentation activity.</p>
                    </div>
                    <div className="overflow-x-auto">
                       <table className="w-full text-left">
                          <thead className="bg-[#F8FAFC] text-[10px] font-bold uppercase text-muted-foreground/60 tracking-[0.4em] border-b border-border">
                             <tr>
                                <th className="px-10 py-6">Staff Member</th>
                                <th className="px-10 py-6">Login Timestamp</th>
                                <th className="px-10 py-6">Activity Audit</th>
                                <th className="px-10 py-6 text-right">Monthly Compliance</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                             {data.staff.map((s:any) => {
                               const att = data.attendance.find((a:any) => a.staffId === s.id);
                               return (
                                 <tr key={`staff-attlog-${s.id}`} className="hover:bg-secondary/20 transition-all">
                                    <td className="px-10 py-8">
                                       <div className="flex items-center gap-4">
                                          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-xs uppercase">{s.fullName.charAt(0)}</div>
                                          <div className="font-bold text-primary text-sm">{s.fullName}</div>
                                       </div>
                                    </td>
                                    <td className="px-10 py-8">
                                       {att ? (
                                         <div className="flex items-center gap-2 text-xs font-medium text-primary/70">
                                            <Clock className="h-4 w-4" /> {new Date(att.loginTime?.seconds * 1000).toLocaleTimeString()}
                                         </div>
                                       ) : (
                                         <div className="text-xs font-bold text-rose-400 uppercase tracking-widest italic flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" /> Not Authenticated
                                         </div>
                                       )}
                                    </td>
                                    <td className="px-10 py-8">
                                       {att?.activityDone ? (
                                         <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-bold uppercase border border-emerald-100">
                                            <FileText className="h-3 w-3" /> Documentation Verified
                                         </div>
                                       ) : (
                                         <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">Pending Audit</span>
                                       )}
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                       <div className="flex flex-col items-end gap-1">
                                          <div className="text-xs font-bold text-primary">100%</div>
                                          <div className="h-1 w-24 bg-emerald-100 rounded-full overflow-hidden">
                                             <div className="h-full bg-emerald-500" style={{ width: '100%' }} />
                                          </div>
                                       </div>
                                    </td>
                                 </tr>
                               );
                             })}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </motion.div>
            )}

            {view === "audit" && (
                <motion.div 
                    key="audit"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="bg-white rounded-[3.5rem] border border-border shadow-clinical overflow-hidden">
                        <div className="p-10 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-primary tracking-tight font-display italic serif">Administrative Audit Ledger</h2>
                                <p className="text-sm text-muted-foreground font-medium">Traceability for all authorization and deployment events.</p>
                            </div>
                            <Activity className="h-8 w-8 text-indigo-500 opacity-20" />
                        </div>
                        <div className="overflow-x-auto min-h-[500px]">
                            <table className="w-full text-left">
                                <thead className="bg-[#F8FAFC] text-[10px] font-bold uppercase text-muted-foreground/60 tracking-[0.4em] border-b border-border">
                                    <tr>
                                        <th className="px-10 py-6">Timestamp</th>
                                        <th className="px-10 py-6">Operator</th>
                                        <th className="px-10 py-6">Action Event</th>
                                        <th className="px-10 py-6 text-right">Context Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {auditLogs.map((log:any) => (
                                        <tr key={`audit-${log.id}`} className="hover:bg-indigo-50/30 transition-all">
                                            <td className="px-10 py-8 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                                {new Date(log.timestamp?.seconds * 1000).toLocaleString()}
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px] uppercase">{log.adminName?.charAt(0)}</div>
                                                    <span className="text-xs font-bold text-primary">{log.adminName}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest">{log.action || "SYSTEM_EVENT"}</span>
                                            </td>
                                            <td className="px-10 py-8 text-right text-xs font-medium text-muted-foreground max-w-md ml-auto leading-relaxed">
                                                {log.details}
                                            </td>
                                        </tr>
                                    ))}
                                    {auditLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-10 py-20 text-center text-muted-foreground italic font-medium">No historical logs found in the ledger.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.div>
            )}

            <AnimatePresence>
               {selectedStaff && (
                  <>
                     <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedStaff(null)}
                        className="fixed inset-0 bg-primary/20 backdrop-blur-md z-[100]"
                     />
                     <motion.div 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed top-0 right-0 h-screen w-full max-w-xl bg-white shadow-2xl z-[101] overflow-y-auto"
                     >
                        <div className="p-12 space-y-12">
                           <div className="flex items-center justify-between">
                              <button onClick={() => setSelectedStaff(null)} className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all"><X className="h-5 w-5" /></button>
                              <div className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-bold uppercase tracking-widest">Active Node</div>
                           </div>
                           
                           <div className="flex flex-col items-center text-center">
                              <div className="h-32 w-32 rounded-[3.5rem] border border-border shadow-clinical overflow-hidden mb-8 group">
                                 <img src={selectedStaff.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStaff.id}`} className="h-full w-full object-cover transition-transform group-hover:scale-110 duration-700" />
                              </div>
                              <h2 className="text-3xl font-bold text-primary italic serif mb-2">{selectedStaff.fullName}</h2>
                              <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">{selectedStaff.specialization || "Clinical Primary Node"}</p>
                           </div>

                           <div className="space-y-4 pt-12 border-t border-border">
                              <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-muted-foreground/60 mb-6 font-display italic">Bio-Security Parameters</h3>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="p-6 bg-secondary/20 rounded-3xl border border-border">
                                    <div className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Email Endpoint</div>
                                    <div className="text-xs font-bold text-primary">{selectedStaff.email}</div>
                                 </div>
                                 <div className="p-6 bg-secondary/20 rounded-3xl border border-border">
                                    <div className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Node Identifier</div>
                                    <div className="text-xs font-bold text-primary">{selectedStaff.staffId || "EXT-001"}</div>
                                 </div>
                                 <div className="p-6 bg-secondary/20 rounded-3xl border border-border">
                                    <div className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Phone Proxy</div>
                                    <div className="text-xs font-bold text-primary">{selectedStaff.phone || "+1... SECURE"}</div>
                                 </div>
                                 <div className="p-6 bg-secondary/20 rounded-3xl border border-border">
                                    <div className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Last Handshake</div>
                                    <div className="text-xs font-bold text-primary">Today 09:42 AM</div>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-6 pt-12 border-t border-border">
                              <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-muted-foreground/60 font-display italic">Operational Control</h3>
                              <div className="space-y-3">
                                 <button className="w-full py-5 bg-rose-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-premium flex items-center justify-center gap-3 hover:bg-rose-700 transition-all">
                                    <ShieldAlert className="h-4 w-4" /> Revoke Authorization
                                 </button>
                                 <button className="w-full py-5 bg-white text-primary border border-border rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-secondary transition-all shadow-sm">
                                    View Full Deployment Profile
                                 </button>
                              </div>
                           </div>
                        </div>
                     </motion.div>
                  </>
               )}
            </AnimatePresence>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function OverviewSmallStat({ label, val }: { label: string; val: any }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-bold text-primary tracking-tight">{val}</div>
    </div>
  );
}

function SidebarNavBtn({ active, icon: Icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] transition-all relative overflow-hidden group ${active ? "bg-white text-primary shadow-premium" : "text-white/60 hover:text-white hover:bg-white/5"}`}
    >
      <Icon className={`h-5 w-5 transition-transform duration-500 ${active ? "scale-110" : "group-hover:scale-110"}`} />
      <span className="text-[13.5px] font-bold tracking-tight">{label}</span>
      {active && (
        <motion.div layoutId="nav-indicator" className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500" />
      )}
    </button>
  );
}

function AdminStatCard({ label, value, icon: Icon, color, bg, trend }: any) {
  return (
    <div className="bg-white p-10 rounded-[3rem] border border-border shadow-clinical flex items-center gap-8 group hover:-translate-y-1 transition-all">
      <div className={`h-16 w-16 rounded-[1.5rem] ${bg} ${color} flex items-center justify-center transition-transform group-hover:scale-110 duration-500`}>
        <Icon className="h-8 w-8" />
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">{label}</p>
        <div className="flex items-baseline gap-3">
           <p className="text-4xl font-bold text-primary tracking-tighter leading-none">{value}</p>
           <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-tighter">
              {trend}
           </span>
        </div>
      </div>
    </div>
  );
}

function QualitySubRow({ label, val }: { label: string; val: number }) {
   return (
      <div className="space-y-2">
         <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <span>{label}</span>
            <span>{val}%</span>
         </div>
         <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <motion.div 
               initial={{ width: 0 }}
               whileInView={{ width: `${val}%` }}
               transition={{ duration: 1.5, ease: "easeOut" }}
               className="h-full bg-primary" 
            />
         </div>
      </div>
   );
}

function EMRInput({ label, name, type = "text", required = false, defaultValue = "", placeholder = "" }: any) {
  return (
    <div className="space-y-3">
       <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.25em] ml-1">{label}</label>
       <input 
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="w-full bg-[#F8FAFC] border border-border rounded-2xl px-6 py-4 text-sm font-bold text-primary outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-muted-foreground/30 placeholder:font-medium"
       />
    </div>
  );
}

function GuarantorCard({ g }: { g: any }) {
    if (!g) return null;
    return (
        <div className="p-8 bg-indigo-50/30 rounded-[2.5rem] border border-indigo-100/50 space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{g.relationship} Verified</span>
                <span className="text-[9px] font-bold uppercase text-muted-foreground/60">REF: {g.idNumber}</span>
            </div>
            <div className="text-lg font-bold text-primary italic serif">{g.fullName}</div>
            <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                <div className="flex items-center gap-2 text-muted-foreground"><Briefcase className="h-3 w-3" /> {g.occupation} @ {g.workplace}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3 w-3" /> {g.phone}</div>
            </div>
            <div className="text-[10px] text-muted-foreground/80 leading-relaxed font-medium">
                <MapPin className="inline h-3 w-3 mr-1" /> {g.address}
            </div>
        </div>
    );
}

