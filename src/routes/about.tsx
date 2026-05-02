import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Heart, Award, Users, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Microscope } from "lucide-react";
import { motion } from "motion/react";

// Placeholders
const about = "https://images.unsplash.com/photo-1576091160550-217359f42f8c?auto=format&fit=crop&q=80&w=1280&h=960";
const clinic = "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1280&h=960";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — PrimeVita Health Services" },
      { name: "description", content: "Discover how PrimeVita combines clinical excellence with deep compassion to redefine homecare." },
    ],
  }),
  component: About,
});

function About() {
  const values = [
    { icon: Heart, title: "Radical Compassion", desc: "We look beyond the diagnosis to see the person, the family, and the legacy they carry." },
    { icon: Award, title: "Clinical Rigor", desc: "Our protocols are built on international standards, ensuring patient safety in every home." },
    { icon: Users, title: "Community Focus", desc: "We dont just provide care; we build trust across neighborhoods, one home at a time." },
    { icon: Microscope, title: "Innovation", desc: "Using digital transparency to ensure families can see and verify the quality of care." },
  ];

  return (
    <div className="min-h-screen bg-background selection:bg-primary/10 selection:text-primary">
      <SiteHeader />

      {/* Hero */}
      <section className="relative pt-20 pb-32 bg-gradient-subtle border-b border-border">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-[11px] font-bold text-primary uppercase tracking-widest mb-8"
          >
             Our Identity & Mission
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold text-primary tracking-tight leading-[0.85] mb-8"
          >
            Engineering <br /> <span className="text-muted-foreground/60">Dignity at Home.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium"
          >
            PrimeVita Health Services was founded on a simple realization: the hospital should be for recovery, but the home is for healing.
          </motion.p>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-32">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
             <div className="absolute -inset-10 bg-primary/5 rounded-full blur-3xl opacity-50" />
             <div className="relative rounded-[3rem] overflow-hidden shadow-premium border-8 border-white">
                <img src={about} alt="The PrimeVita team" className="w-full h-[600px] object-cover" />
             </div>
             <div className="absolute -top-10 -right-10 bg-white p-8 rounded-3xl shadow-premium border border-border hidden md:block">
                <div className="text-4xl font-bold text-primary mb-1">100%</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Certified Clinicians</div>
             </div>
          </motion.div>
          <div className="max-w-xl">
             <h2 className="text-4xl md:text-5xl font-bold text-primary tracking-tight mb-8">Breaking the cycle of impersonal care.</h2>
             <div className="space-y-6 text-muted-foreground text-lg leading-relaxed">
                <p>
                  For years, homecare was treated as a secondary service. At PrimeVita, we treat it as a primary clinical specialization. 
                </p>
                <p>
                  We hire only board-certified nurses and trained caregivers who pass a rigorous 12-point vetting process. Why? Because you aren't just letting a professional into your house—you're letting them into your family's life.
                </p>
             </div>
             <div className="mt-12 grid grid-cols-2 gap-8 py-10 border-y border-border">
                <div>
                   <h4 className="text-primary font-bold text-lg mb-2">Our Reach</h4>
                   <p className="text-sm text-muted-foreground">Serving families across the greater Lagos metropolitan area and beyond.</p>
                </div>
                <div>
                   <h4 className="text-primary font-bold text-lg mb-2">Our Impact</h4>
                   <p className="text-sm text-muted-foreground">98% customer loyalty rate based on independent family reviews.</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Values Grid */}
      <section className="py-32 bg-secondary/50 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">The Core Principles</h2>
        </div>
        <div className="mx-auto max-w-7xl px-4 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((v, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -5 }}
              className="bg-white rounded-[2rem] p-10 border border-border shadow-clinical transition-all"
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <v.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-3">{v.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Clinical Standards Section */}
      <section className="py-32 bg-white">
        <div className="mx-auto max-w-7xl px-4">
           <div className="bg-primary rounded-[3.5rem] p-12 md:p-24 text-white grid lg:grid-cols-[1fr_1.2fr] gap-20 items-center overflow-hidden relative">
              <div className="absolute top-0 right-0 h-full w-1/4 bg-white/5 -skew-x-12" />
              <div>
                 <span className="text-white/60 font-bold uppercase tracking-widest text-[11px] mb-6 block">Accreditation & Standards</span>
                 <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-8">Clinical rigor is not optional.</h2>
                 <p className="text-white/70 text-lg mb-10 leading-relaxed">
                   Every PrimeVita nurse and caregiver receives continuous education. We track patient outcomes in real-time, allowing us to pivot care plans exactly when needed.
                 </p>
                 <div className="flex items-center gap-8 pt-4">
                    <div className="flex flex-col gap-1">
                       <span className="text-3xl font-bold">128+</span>
                       <span className="text-[10px] uppercase font-bold opacity-60">Staff Audits Yearly</span>
                    </div>
                    <div className="h-12 w-px bg-white/20" />
                    <div className="flex flex-col gap-1">
                       <span className="text-3xl font-bold">0%</span>
                       <span className="text-[10px] uppercase font-bold opacity-60">Shadow Billing</span>
                    </div>
                 </div>
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                 {[
                   { t: "HEPA Filtering", d: "Standard during all home visits." },
                   { t: "EMR Integrated", d: "Real-time logging of all data." },
                   { t: "Bio-Waste Management", d: "Professional disposal protocols." },
                   { t: "Emergency Response", d: "24/7 clinical on-call support." }
                 ].map((box, i) => (
                   <div key={i} className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20">
                      <div className="font-bold text-lg mb-1">{box.t}</div>
                      <p className="text-white/60 text-xs">{box.d}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </section>

      {/* Final Quote */}
      <section className="py-32 text-center bg-background">
         <div className="mx-auto max-w-3xl px-4">
            <Microscope className="h-12 w-12 text-primary/20 mx-auto mb-8" />
            <h2 className="text-3xl md:text-5xl font-bold text-primary tracking-tight italic serif leading-tight">
               "We dont just send people into homes. We send peace of mind into families."
            </h2>
            <div className="mt-12">
               <Link to="/contact" className="inline-flex items-center gap-3 rounded-full bg-primary text-white px-10 py-5 text-sm font-bold shadow-premium hover:bg-primary/90 no-underline transition-all">
                  Partner with Us <ArrowRight className="h-4 w-4" />
               </Link>
            </div>
         </div>
      </section>

      <SiteFooter />
    </div>
  );
}

