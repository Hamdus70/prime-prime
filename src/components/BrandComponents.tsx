import { Link, useNavigate } from "@tanstack/react-router";
import { PrimeVitaLogo } from "./PrimeVitaLogo";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Phone, Globe, ShieldCheck, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";

export function WhatsAppFAB() {
  const phoneNumber = "+2347012918331";
  const message = "Hello PrimeVita, I would like to inquire about your health services.";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <motion.a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-8 right-8 z-[1000] h-16 w-16 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(37,211,102,0.4)] no-underline group"
    >
      <MessageCircle className="h-8 w-8" />
      <span className="absolute right-full mr-4 px-4 py-2 bg-white text-primary text-xs font-bold rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-emerald-50">
        Chat with Clinical Support
      </span>
      <span className="absolute -top-1 -right-1 h-4 w-4 bg-accent rounded-full border-2 border-white animate-pulse" />
    </motion.a>
  );
}

export function BrandHeader() {
  const [isOpen, setIsOpen] = useState(false);
  
  const navLinks = [
    { name: "Home", to: "/" },
    { name: "About Us", to: "/#about" },
    { name: "Services", to: "/#services" },
    { name: "Digital Portal", to: "/portal" },
    { name: "Support", to: "/#support" },
  ];

  return (
    <header className="fixed top-0 inset-x-0 h-[80px] bg-white/90 backdrop-blur-md border-b border-emerald-50 z-[100] shadow-sm">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Logo Section */}
        <Link to="/" className="flex items-center gap-3 no-underline group">
          <div className="bg-primary/5 p-1.5 rounded-xl border border-primary/10 group-hover:scale-105 transition-transform duration-300">
            <PrimeVitaLogo className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-xl sm:text-2xl font-bold text-primary italic serif">PrimeVita</span>
            <span className="text-[7px] sm:text-[8px] uppercase tracking-[0.3em] text-muted-foreground font-bold font-sans">Health Services</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6">
          {[
            { name: "Home", to: "/" },
            { name: "Clinical Excellence", to: "/#services" },
            { name: "Patient Portal", to: "/portal/patient" },
            { name: "Clinician Node", to: "/portal/staff" },
            { name: "Join Network", to: "/portal/apply" },
          ].map((link) => (
            <Link 
              key={link.name}
              to={link.to}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 hover:text-primary transition-colors no-underline px-2 py-1"
            >
              {link.name}
            </Link>
          ))}
          <Link 
            to="/assessment" 
            className="group relative bg-[#003B2D] text-white pl-6 pr-12 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-premium hover:shadow-glow transition-all no-underline overflow-hidden border border-[#014D3B]"
          >
            <span className="relative z-10">Care Intake</span>
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-accent flex items-center justify-center group-hover:w-14 transition-all border-l border-white/10">
              <ShieldCheck className="h-4 w-4 text-[#003B2D]" />
            </div>
          </Link>
        </nav>

        {/* Mobile Toggle */}
        <button className="lg:hidden p-2 text-primary" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden absolute top-[80px] inset-x-0 bg-white border-b border-border p-6 shadow-2xl flex flex-col gap-6"
        >
          {navLinks.map((link) => (
            <Link 
              key={link.name}
              to={link.to}
              onClick={() => setIsOpen(false)}
              className="text-lg font-bold text-primary no-underline"
            >
              {link.name}
            </Link>
          ))}
          <Link 
            to="/portal"
            className="w-full h-14 bg-primary text-white rounded-2xl flex items-center justify-center font-bold uppercase tracking-widest no-underline"
          >
            Digital Portal
          </Link>
        </motion.div>
      )}
    </header>
  );
}

export function BrandFooter() {
  return (
    <footer className="bg-primary pt-24 pb-12 text-white/80">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-1 border-r border-white/5 pr-8">
            <Link to="/" className="flex items-center gap-3 no-underline text-white mb-6">
              <PrimeVitaLogo className="h-8 w-8 brightness-0 invert" />
              <span className="font-display text-xl font-bold italic serif">PrimeVita</span>
            </Link>
            <p className="text-sm leading-relaxed mb-8 text-white/60">
              Defining the gold standard in clinical home care, nursing excellence, and professional caregiving across the nation.
            </p>
            <div className="flex gap-4">
               {/* Social Icons Placeholder */}
               <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-accent hover:text-primary transition-colors cursor-pointer">
                  <Globe className="h-4 w-4" />
               </div>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent mb-8">Clinical Services</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li className="hover:text-white transition-colors cursor-pointer">Post-Surgical Care</li>
              <li className="hover:text-white transition-colors cursor-pointer">Physiotherapy Nodes</li>
              <li className="hover:text-white transition-colors cursor-pointer">Wound Management</li>
              <li className="hover:text-white transition-colors cursor-pointer">Geriatric Excellence</li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent mb-8">Infrastructure</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link to="/portal" className="text-white/60 hover:text-white no-underline">Portal Gateway</Link></li>
              <li><Link to="/portal/apply" className="text-white/60 hover:text-white no-underline">Join Network</Link></li>
              <li><Link to="/" className="text-white/60 hover:text-white no-underline">Quality Audits</Link></li>
              <li><Link to="/" className="text-white/60 hover:text-white no-underline">Support Desk</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent mb-8">Operational HQ</h4>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Phone className="h-5 w-5 text-accent mt-1" />
                <div>
                   <div className="text-white font-bold tracking-tight">Clinical Dispatch</div>
                   <div className="text-sm opacity-60">+1 (800) PRIMEVITA</div>
                </div>
              </div>
              <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                 <div className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2">Facility ID</div>
                 <div className="text-xs font-mono opacity-50">PV-HQ-GLOBAL-7781-A</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-40">
            © 2026 PrimeVita Health Services Group. All Rights Reserved.
          </p>
          <div className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest opacity-40">
            <span className="hover:opacity-100 transition-opacity cursor-pointer">Privacy Protocol</span>
            <span className="hover:opacity-100 transition-opacity cursor-pointer">Terms of Operation</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function BrandContextBanner({ size = "full" }: { size?: "full" | "slim" }) {
  const bannerImg = "https://r2.erweima.ai/i/z7G0_lFWR5m7u3d_6L0-Qw.png";
  
  if (size === "slim") {
    return (
      <div className="relative h-[120px] w-full overflow-hidden">
        <img src={bannerImg} alt="Branding" className="w-full h-full object-cover brightness-[0.3] contrast-125" />
        <div className="absolute inset-0 bg-primary/40 backdrop-blur-[2px]" />
        <div className="absolute inset-0 flex items-center px-10">
          <div className="flex items-center gap-4">
             <PrimeVitaLogo className="h-10 w-10 brightness-0 invert opacity-50" />
             <div className="h-10 w-px bg-white/20 mx-2" />
             <span className="text-white font-display italic text-xl tracking-wide opacity-80">Compassionate • Professional • Reliable</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="relative h-[65vh] min-h-[500px] w-full flex items-center overflow-hidden">
      <img 
        src={bannerImg} 
        alt="PrimeVita Banner" 
        className="absolute inset-0 w-full h-full object-cover brightness-[0.4] contrast-110 scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/40 to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
        <motion.div
           initial={{ opacity: 0, x: -30 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8 }}
           className="max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/20 backdrop-blur-md border border-accent/30 rounded-full text-[10px] font-bold text-accent uppercase tracking-[0.3em] mb-8 shadow-glow">
            <ShieldCheck className="h-4 w-4" /> Nationally Licensed Healthcare
          </div>
          <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tighter leading-[0.95] font-display italic mb-8">
            Superior Care. <br />At <span className="text-accent underline decoration-accent/30 underline-offset-8">Home.</span>
          </h1>
          <p className="text-white/80 text-xl font-medium leading-relaxed max-w-lg mb-12">
            PrimeVita Health Services bridging the gap between hospital-grade clinical excellence and the comfort of your sanctuary.
          </p>
          <div className="flex flex-wrap gap-6">
            <Link to="/portal" className="h-16 px-10 bg-accent text-primary rounded-2xl flex items-center justify-center font-bold uppercase tracking-widest shadow-premium hover:shadow-glow transition-all no-underline">
              Enter Digital Portal
            </Link>
            <Link to="/portal/apply" className="h-16 px-10 border-2 border-white/20 text-white hover:bg-white/5 rounded-2xl flex items-center justify-center font-bold uppercase tracking-widest transition-all no-underline">
              Apply as Clinician
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-12 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
         <span className="flex items-center gap-2">01 Biometric Verification</span>
         <div className="h-4 w-px bg-white/10" />
         <span className="flex items-center gap-2">02 RN Case Managers</span>
         <div className="h-4 w-px bg-white/10" />
         <span className="flex items-center gap-2">03 Clinical Fidelity</span>
      </div>
    </section>
  );
}
