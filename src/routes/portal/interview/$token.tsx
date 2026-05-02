import { useState, useEffect } from 'react';
import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Video, Mic, Camera, User, Phone, Mail, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/portal/interview/$token')({
  component: InterviewRoom,
});

function InterviewRoom() {
    const { token } = useParams({ from: '/portal/interview/$token' });
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [application, setApplication] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [authenticated, setAuthenticated] = useState(false);
    const [error, setError] = useState('');
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        fetchInterviewNode();
    }, [token]);

    async function fetchInterviewNode() {
        try {
            setLoading(true);
            const q = query(collection(db, 'applications'), where('interview.token', '==', token), limit(1));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                setError('Interview session not found or link expired.');
            } else {
                setApplication({ id: snap.docs[0].id, ...snap.docs[0].data() });
            }
        } catch (err) {
            setError('Security handshake failed.');
        } finally {
            setLoading(false);
        }
    }

    async function handleLogin() {
        if (!application) return;
        setConnecting(true);
        setError('');

        if (email.toLowerCase() === application.email.toLowerCase() && phone === application.phone) {
            setAuthenticated(true);
            toast.success("Security credentials verified.");
        } else {
            setError("Identity mismatch. Please use the email and phone number provided during application.");
        }
        setConnecting(false);
    }

    if (loading) return <FullScreenLoader />;

    if (error && !authenticated) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
                <div className="max-w-md space-y-6">
                    <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto" />
                    <h1 className="text-3xl font-bold text-white italic serif">Access Terminated</h1>
                    <p className="text-slate-400 font-medium">{error}</p>
                    <button onClick={() => navigate({ to: '/' })} className="px-8 py-3 bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-all">
                        Exit Node
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-white overflow-hidden">
            <AnimatePresence mode="wait">
                {!authenticated ? (
                    <motion.div 
                        key="auth"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="min-h-screen flex items-center justify-center p-6"
                    >
                        <div className="max-w-sm w-full space-y-12 bg-white/5 border border-white/10 p-12 rounded-[2.5rem] backdrop-blur-xl">
                            <div className="text-center space-y-4">
                                <Lock className="h-10 w-10 text-indigo-400 mx-auto" />
                                <h2 className="text-2xl font-bold italic serif">Identity Verification</h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Secure Handshake Required</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Email Interface</label>
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                                        placeholder="Enter registered email"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Phone Uplink</label>
                                    <input 
                                        type="text" 
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                                        placeholder="+234..."
                                    />
                                </div>
                                {error && <p className="text-rose-400 text-[10px] font-bold uppercase text-center">{error}</p>}
                                <button 
                                    onClick={handleLogin}
                                    disabled={connecting}
                                    className="w-full h-14 bg-indigo-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-glow flex items-center justify-center gap-2"
                                >
                                    {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Establish Connection'}
                                </button>
                                <div className="pt-6 border-t border-white/5">
                                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">
                                      Dev Mode Hint: <span className="text-indigo-400 cursor-pointer" onClick={() => { setEmail(application.email); setPhone(application.phone); }}>Auto-fill Credentials</span>
                                   </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="room"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="h-screen flex flex-col"
                    >
                        {/* Interview Interface */}
                        <header className="h-20 border-b border-white/5 px-8 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Video className="h-5 w-5 text-emerald-400" />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400">Secure Interview Node</h4>
                                    <p className="text-sm font-bold italic serif">{application.fullName} • {application.role.toUpperCase()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Authorized</span>
                                </div>
                                <button className="px-6 py-2 bg-rose-500 font-bold text-[9px] uppercase tracking-widest rounded-lg hover:bg-rose-600 transition-all">Disconnect</button>
                            </div>
                        </header>

                        <main className="flex-1 flex gap-6 p-6">
                            {/* Main Video Stage */}
                            <div className="flex-1 bg-slate-900/50 rounded-[3rem] border border-white/5 flex flex-col relative overflow-hidden group">
                                <div className="absolute top-8 left-8 z-10 flex items-center gap-3">
                                    <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                                        <Camera className="h-3 w-3 text-slate-400" />
                                        <span className="text-[8px] font-bold uppercase text-slate-300">Remote Participant</span>
                                    </div>
                                </div>
                                
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center space-y-6">
                                        <div className="h-32 w-32 bg-slate-800 rounded-full mx-auto flex items-center justify-center border-4 border-slate-700 animate-pulse">
                                            <User className="h-12 w-12 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold italic serif">Waiting for clinical panel...</p>
                                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Node is transmitting</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 px-8 py-4 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-500">
                                    <button className="h-10 w-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10"><Mic className="h-5 w-5" /></button>
                                    <button className="h-10 w-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10"><Camera className="h-5 w-5" /></button>
                                    <button className="h-10 w-10 bg-rose-500/20 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500/30">End</button>
                                </div>
                            </div>

                            {/* Sidebar Info */}
                            <div className="w-80 space-y-6">
                                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-6">
                                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocol Check</h5>
                                    <div className="space-y-4">
                                        <ProtocolItem icon={Mic} label="Audio Grid" status="active" />
                                        <ProtocolItem icon={Camera} label="Video Uplink" status="active" />
                                        <ProtocolItem icon={CheckCircle2} label="Latency" status="32ms" />
                                    </div>
                                </div>
                                
                                <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[2.5rem] space-y-4">
                                    <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Candidate Intel</h5>
                                    <div className="text-xs font-bold leading-relaxed opacity-80">
                                        You are currently in the pre-briefing stage. Please ensure you have your ID documents ready for visual verification upon panel arrival.
                                    </div>
                                </div>
                            </div>
                        </main>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ProtocolItem({ icon: Icon, label, status }: { icon: any; label: string; status: string }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-white/5 rounded-lg flex items-center justify-center">
                    <Icon className="h-4 w-4 text-slate-400" />
                </div>
                <span className="text-[10px] font-bold text-slate-300">{label}</span>
            </div>
            <span className="text-[8px] font-bold uppercase text-emerald-500">{status}</span>
        </div>
    );
}

function FullScreenLoader() {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl animate-pulse" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.5em]">Establishing Secure Node</p>
        </div>
    );
}
