import { useState, useEffect } from 'react';
import { createFileRoute, useParams, Link } from '@tanstack/react-router';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, ShieldCheck, Calendar, FileText, CheckCircle2, Clock, MapPin, Phone, User, Fingerprint } from 'lucide-react';

export const Route = createFileRoute('/portal/track/$token')({
  component: ApplicationTrackPage,
});

function ApplicationTrackPage() {
    const { token } = useParams({ from: '/portal/track/$token' });
    const [loading, setLoading] = useState(true);
    const [application, setApplication] = useState<any>(null);
    const [otp, setOtp] = useState('');
    const [verified, setVerified] = useState(false);
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        fetchApplication();
    }, [token]);

    async function fetchApplication() {
        try {
            setLoading(true);
            const q = query(collection(db, 'applications'), where('trackingToken', '==', token), limit(1));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                setError('Application node not found in registry.');
            } else {
                setApplication(snap.docs[0].data());
            }
        } catch (err) {
            setError('System error tracing application uplink.');
        } finally {
            setLoading(false);
        }
    }

    async function handleVerify() {
        if (!application) return;
        setVerifying(true);
        setError('');

        try {
            if (otp === application.otp) {
                // Check expiry (handled as ISO string in this implementation)
                const expiryTime = new Date(application.otpExpiresAt).getTime();
                if (expiryTime < Date.now()) {
                    setError('OTP security token has expired.');
                } else {
                    setVerified(true);
                }
            } else {
                setError('Invalid security authorization code.');
            }
        } catch (err) {
            setError('Verification uplink failed.');
        } finally {
            setVerifying(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
        );
    }

    if (error && !application) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
                <div className="max-w-md space-y-6">
                    <div className="h-20 w-20 bg-rose-100 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto">
                        <ShieldCheck className="h-10 w-10" />
                    </div>
                    <h1 className="text-3xl font-bold italic serif">Access Denied</h1>
                    <p className="text-muted-foreground font-medium">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900">
            <header className="h-20 border-b border-border px-8 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-40">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-xl">
                        <Fingerprint className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="text-sm font-bold italic serif">PrimeVita Tracking</div>
                        <div className="text-[7px] tracking-[0.3em] font-bold text-muted-foreground uppercase leading-none">Security Dashboard</div>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-primary/40">
                    <Clock className="h-3 w-3" /> Real-time Sync Active
                </div>
            </header>

            <main className="max-w-5xl mx-auto py-16 px-6">
                <AnimatePresence mode="wait">
                    {!verified ? (
                        <motion.div 
                            key="otp"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="max-w-md mx-auto space-y-10 text-center"
                        >
                            <div className="space-y-4">
                                <h1 className="text-4xl font-bold tracking-tight italic serif">Security Checkpoint</h1>
                                <p className="text-muted-foreground font-medium">Please enter the 6-digit OTP sent to your registered email during application submission.</p>
                            </div>

                            <div className="space-y-6">
                                <input 
                                    type="text" 
                                    maxLength={6}
                                    placeholder="Enter OTP Code"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value)}
                                    className="w-full h-16 bg-slate-50 border border-border text-center text-2xl font-bold tracking-[0.5em] rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all uppercase"
                                />
                                {error && <p className="text-rose-600 text-xs font-bold uppercase tracking-widest bg-rose-50 p-4 rounded-xl">{error}</p>}
                                <button 
                                    onClick={handleVerify}
                                    disabled={verifying || otp.length < 6}
                                    className="w-full h-16 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-premium hover:shadow-glow transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {verifying ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Verify Identity <ShieldCheck className="h-4 w-4" /></>}
                                </button>
                                <div className="pt-6 border-t border-slate-100">
                                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                      Dev Notice: Your authorization code is: <span className="text-indigo-600 underline cursor-pointer" onClick={() => setOtp(application.otp)}>{application.otp}</span>
                                   </p>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="content"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-12"
                        >
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Identity Authenticated</span>
                                    </div>
                                    <h1 className="text-5xl font-bold tracking-tight italic serif">Application Roadmap</h1>
                                    <p className="text-muted-foreground font-medium">Tracking node for: <span className="text-primary">{application.fullName}</span></p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="px-6 py-3 bg-secondary/30 rounded-xl border border-border">
                                        <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Status Uplink</div>
                                        <div className="text-xs font-bold text-primary uppercase">{application.status}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid lg:grid-cols-3 gap-12">
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="bg-white rounded-[2.5rem] p-10 border border-border shadow-clinical space-y-10">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-primary/40 border-b border-border pb-4">Lifecycle Events</h3>
                                        
                                        <div className="space-y-12">
                                            <TimelineStep 
                                                title="Application Submitted" 
                                                time={application.createdAt?.toDate()?.toLocaleString()} 
                                                desc="Full clinical profile entered into the primary health registry."
                                                status="completed"
                                            />
                                            <TimelineStep 
                                                title="Document Verification" 
                                                time="Processing..." 
                                                desc="Administrative team is auditing your licenses and educational certificates."
                                                status={application.status === 'pending' ? 'active' : 'completed'}
                                            />
                                            <TimelineStep 
                                                title="Clinical Interview" 
                                                time={application.interview ? new Date(application.interview.scheduledDate.seconds * 1000).toLocaleString() : 'Not Scheduled'} 
                                                desc={application.interview ? "Secure interview invitation issued. Access link below." : "Scheduled upon document clearance."}
                                                status={application.interview ? (application.status === 'interview' ? 'active' : 'completed') : 'upcoming'}
                                            />
                                            <TimelineStep 
                                                title="Onboarding & Deployment" 
                                                time="Pending Clearance" 
                                                desc="Final clinical security induction and facility assignment."
                                                status="upcoming"
                                            />
                                        </div>
                                    </div>

                                    {application.interview && application.status === 'interview' && (
                                        <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white space-y-6 shadow-glow">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] opacity-60">Interview Command Hub</h3>
                                                <Calendar className="h-6 w-6 opacity-60" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-2xl font-bold italic serif">Your clinical interview is live!</p>
                                                <p className="text-indigo-100 text-sm opacity-80">Please join the secure session 5 minutes before the scheduled time.</p>
                                            </div>
                                            <Link 
                                                to="/portal/interview/$token" 
                                                params={{ token: application.interview.token }}
                                                className="w-full h-16 bg-white text-indigo-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center shadow-premium"
                                            >
                                                Join Secure Interview Node
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-8">
                                    <div className="bg-slate-50 rounded-[2rem] p-8 border border-border space-y-6">
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Profile Parameters</h3>
                                        <div className="space-y-4">
                                            <ProfileField icon={User} label="Designated Role" value={application.role} />
                                            <ProfileField icon={MapPin} label="Location" value={application.address} />
                                            <ProfileField icon={Phone} label="Emergency Uplink" value={application.phone} />
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6">
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Security Notice</h3>
                                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                            This link is session-locked. Sharing your tracking token compromises clinical identity integrity. Report any unauthorized access immediately.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

function TimelineStep({ title, time, desc, status }: { title: string; time: string; desc: string; status: 'completed' | 'active' | 'upcoming' }) {
    return (
        <div className="flex gap-6 relative">
            <div className="flex flex-col items-center">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center z-10 ${
                    status === 'completed' ? 'bg-primary text-white' : 
                    status === 'active' ? 'bg-white border-4 border-primary text-primary' : 
                    'bg-slate-100 text-slate-400 border border-slate-200'
                }`}>
                    {status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-current" />}
                </div>
                <div className="flex-1 w-px bg-slate-100 my-2" />
            </div>
            <div className="pb-8 space-y-2">
                <div className="flex items-center gap-3">
                    <h4 className={`text-sm font-bold ${status === 'upcoming' ? 'text-slate-400' : 'text-primary'}`}>{title}</h4>
                    <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 bg-secondary/30 px-2 py-0.5 rounded-full">{time}</span>
                </div>
                <p className={`text-xs font-medium leading-relaxed ${status === 'upcoming' ? 'text-slate-300' : 'text-muted-foreground'}`}>{desc}</p>
            </div>
        </div>
    );
}

function ProfileField({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-white rounded-xl border border-border flex items-center justify-center text-primary/40 shadow-sm">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{label}</div>
                <div className="text-[11px] font-bold text-primary truncate max-w-[150px]">{value}</div>
            </div>
        </div>
    );
}
