import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandContextBanner } from "@/components/BrandComponents";
import { motion } from "motion/react";
import { ShieldCheck, Heart, Stethoscope, Activity, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex flex-col">
      <BrandContextBanner size="full" />

      {/* Trust Badges */}
      <div className="bg-white border-b border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-6">
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
              <div className="flex items-center justify-center font-display font-bold text-lg text-primary italic">Certified Healthcare</div>
              <div className="flex items-center justify-center font-display font-bold text-lg text-primary italic">Clinical Excellence</div>
              <div className="flex items-center justify-center font-display font-bold text-lg text-primary italic">Safety Verified</div>
              <div className="flex items-center justify-center font-display font-bold text-lg text-primary italic">Premium Care</div>
              <div className="flex items-center justify-center font-display font-bold text-lg text-primary italic hidden lg:flex">Global Standard</div>
           </div>
        </div>
      </div>

      {/* Services Grid */}
      <section id="services" className="py-32 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-20">
            <div className="max-w-2xl">
              <span className="text-accent text-[10px] font-bold uppercase tracking-[0.4em] mb-6 block">Our Core Capabilities</span>
              <h2 className="text-6xl font-bold text-primary tracking-tight font-display italic serif">Clinical Node <br /><span className="text-slate-200">Excellence.</span></h2>
            </div>
            <p className="text-muted-foreground text-lg font-medium max-w-sm leading-relaxed mb-4">
              We specialize in complex clinical transitions, chronic illness management, and professional rehabilitation.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ServiceCard 
              icon={Stethoscope}
              title="Skilled Nursing"
              desc="Board-certified RNs providing hospital-level care, infusion therapy, and advanced wound management in your residence."
              list={["Post-Surgical Control", "Medication Management", "Lab Syncing"]}
            />
            <ServiceCard 
              icon={Activity}
              title="Physical Therapy"
              desc="Personalized rehabilitation protocols designed to restore mobility, strength, and neurological fidelity."
              list={["Strength Recovery", "Gait Training", "Fall Prevention"]}
            />
            <ServiceCard 
              icon={Heart}
              title="Concierge Care"
              desc="Elegantly delivered daily living support, cognitive engagement, and lifestyle assistance."
              list={["Memory Support", "Nutritional Sync", "Wellness Monitoring"]}
            />
          </div>
        </div>
      </section>

      {/* Digital Infrastructure CTA */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
           <div className="bg-primary rounded-[4rem] p-16 md:p-24 relative overflow-hidden text-white shadow-premium">
              <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 skew-x-[-20deg] translate-x-1/2" />
              <div className="relative z-10 max-w-3xl">
                 <h2 className="text-4xl md:text-6xl font-bold font-display italic serif mb-8 leading-tight">Secure Digital <br />Health Sovereignty.</h2>
                 <p className="text-xl text-white/70 font-medium mb-12 leading-relaxed">
                    Access your full clinical records, biometric dashboard, and real-time care plan verification through our proprietary digital portal.
                 </p>
                 <div className="flex flex-wrap gap-6">
                    <Link to="/portal" className="h-16 px-10 bg-accent text-primary rounded-2xl flex items-center justify-center font-bold uppercase tracking-widest shadow-xl hover:shadow-glow transition-all no-underline">
                       Access Portal
                    </Link>
                    <div className="flex items-center gap-4 text-white/40">
                       <ShieldCheck className="h-8 w-8 text-white/20" />
                       <div className="text-[10px] font-bold uppercase tracking-widest leading-tight">
                          256-Bit Encrypted<br />HIPAA Compliant
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>
    </div>
  );
}

function ServiceCard({ icon: Icon, title, desc, list }: any) {
  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-clinical group transition-all"
    >
      <div className="h-20 w-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-10 group-hover:bg-primary group-hover:text-white transition-all duration-500">
        <Icon className="h-10 w-10 transition-transform group-hover:scale-110" />
      </div>
      <h3 className="text-2xl font-bold text-primary mb-4 font-display italic serif tracking-tight">{title}</h3>
      <p className="text-muted-foreground font-medium text-base mb-10 leading-relaxed">{desc}</p>
      
      <ul className="space-y-4 mb-10">
         {list.map((item: string, i: number) => (
           <li key={i} className="flex items-center gap-3 text-xs font-bold text-primary uppercase tracking-widest opacity-60">
             <div className="h-1.5 w-1.5 rounded-full bg-accent" />
             {item}
           </li>
         ))}
      </ul>

      <Link 
        to="/portal" 
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:text-accent transition-colors no-underline"
      >
        Learn More <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.div>
  );
}

