import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Stethoscope, Users, Activity, Heart, Pill, Brain, ArrowRight, CheckCircle2, ChevronRight, Microscope } from "lucide-react";
import { motion } from "motion/react";

// Placeholders
const hero = "https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&q=80&w=1280&h=1280";
const nursing = "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=1024&h=768";
const caregiving = "https://images.unsplash.com/photo-1581579186913-45ac3e6efe93?auto=format&fit=crop&q=80&w=1024&h=768";
const physio = "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1024&h=768";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Specialized Services — PrimeVita Health Services" },
      { name: "description", content: "Explore our range of clinical home-care services, from skilled nursing to specialized physiotherapy." },
    ],
  }),
  component: Services,
});

type Service = {
  id: string;
  img: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  intro: string;
  dutiesHeading: string;
  duties: string[];
  closing?: string;
};

const mainServices: Service[] = [
  {
    id: "skilled-nursing",
    img: nursing,
    icon: Stethoscope,
    title: "Skilled Nursing",
    intro: "Precision medical care delivered at home. Our registered nurses manage complex conditions with hospital-grade protocols.",
    dutiesHeading: "Clinical Competencies",
    duties: [
      "Advanced wound management & dressing",
      "IV Therapy and Medication Administration",
      "Chronic disease monitoring (Diabetes, Renal, Cardiac)",
      "Post-operative recovery & monitoring",
      "Pain management & palliative support"
    ],
  },
  {
    id: "personal-caregiving",
    img: caregiving,
    icon: Users,
    title: "Expert Caregiving",
    intro: "Professional assistance for daily life, delivered with profound respect for independence and personal routines.",
    dutiesHeading: "Daily Living Support",
    duties: [
      "Assistance with mobility & transfers",
      "Personal hygiene & grooming support",
      "Meal preparation & nutrition tracking",
      "Light housekeeping & laundry",
      "Medication reminders & companionship"
    ],
  },
  {
    id: "physiotherapy",
    img: physio,
    icon: Activity,
    title: "Physiotherapy",
    intro: "In-home rehabilitation focused on restoring strength, balance, and the joy of movement.",
    dutiesHeading: "Therapeutic Focus",
    duties: [
      "Post-stroke neurological rehabilitation",
      "Orthopedic & post-surgical recovery",
      "Balance training & fall prevention",
      "Muscle strengthening & flexibility",
      "Assessment of home safety/ergonomics"
    ],
  },
];

const specialized = [
  { id: "post-operative", icon: Heart, title: "Post-Operative Care", desc: "Structured recovery tracks that bridge the gap between surgery and full independence." },
  { id: "chronic-care", icon: Pill, title: "Long-term Support", desc: "Sustained management for chronic conditions focusing on quality of life and prevention." },
  { id: "dementia-care", icon: Brain, title: "Memory Support", desc: "Specialized dementia and Alzheimer's care delivered with expertise and patience." },
];

function Services() {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/10 selection:text-primary">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 bg-primary text-white overflow-hidden">
        <div className="absolute top-0 right-0 h-full w-1/2 opacity-20 hidden lg:block">
           <img src={hero} className="h-full w-full object-cover grayscale" />
           <div className="absolute inset-0 bg-gradient-to-r from-primary via-transparent to-transparent" />
        </div>
        <div className="mx-auto max-w-7xl px-4 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:max-w-xl"
          >
            <span className="text-white/60 font-bold uppercase tracking-widest text-[11px] mb-6 block">Our Clinical Scope</span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.85] mb-8">
              Pathways <br /> to <span className="text-white/40 italic serif font-medium">Recovery.</span>
            </h1>
            <p className="text-white/70 text-lg md:text-xl leading-relaxed mb-10">
              We provide a full spectrum of home-based medical services, authenticated by clinical excellence and delivered with genuine care.
            </p>
            <div className="flex flex-wrap gap-4">
               <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20">
                  <div className="text-2xl font-bold">24/7</div>
                  <div className="text-[10px] uppercase font-bold opacity-60 tracking-wider">Availability</div>
               </div>
               <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20">
                  <div className="text-2xl font-bold">1:1</div>
                  <div className="text-[10px] uppercase font-bold opacity-60 tracking-wider">Patient Ratio</div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Detail List */}
      <section className="py-32">
        <div className="mx-auto max-w-7xl px-4 space-y-40">
           {mainServices.map((service, idx) => (
             <motion.article 
               key={service.id} 
               id={service.id}
               initial={{ opacity: 0, y: 40 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, margin: "-100px" }}
               className={`grid lg:grid-cols-2 gap-20 items-center ${idx % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
             >
                <div className={`${idx % 2 === 1 ? 'lg:order-2' : ''} relative`}>
                   <div className="absolute -inset-10 bg-primary/5 rounded-[4rem] blur-3xl opacity-50" />
                   <div className="relative rounded-[3rem] overflow-hidden shadow-premium border-4 border-white group">
                      <img src={service.img} alt={service.title} className="w-full h-[550px] object-cover transition-transform duration-700 group-hover:scale-105" />
                   </div>
                   <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-3xl shadow-premium border border-border">
                      <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center mb-3">
                         <service.icon className="h-6 w-6" />
                      </div>
                      <div className="font-bold text-primary">Certified Expert</div>
                   </div>
                </div>

                <div className={`${idx % 2 === 1 ? 'lg:order-1' : ''}`}>
                   <h2 className="text-4xl md:text-5xl font-bold text-primary tracking-tight mb-6">{service.title}</h2>
                   <p className="text-muted-foreground text-lg leading-relaxed mb-10">
                     {service.intro}
                   </p>
                   
                   <div className="bg-secondary/30 p-10 rounded-[2.5rem] border border-border/50">
                      <h4 className="text-primary font-bold uppercase tracking-widest text-[11px] mb-6 flex items-center gap-2">
                         <CheckCircle2 className="h-3.5 w-3.5" /> {service.dutiesHeading}
                      </h4>
                      <ul className="space-y-4">
                         {service.duties.map((duty, dIdx) => (
                           <li key={dIdx} className="flex gap-4 text-foreground/80 font-medium group">
                              <span className="h-2 w-2 rounded-full bg-primary/20 shrink-0 mt-2 transition-colors group-hover:bg-primary" />
                              <span className="text-[15px]">{duty}</span>
                           </li>
                         ))}
                      </ul>
                   </div>
                   
                   <Link to="/contact" className="mt-10 inline-flex items-center gap-2 text-sm font-bold text-primary group no-underline transition-all hover:gap-4">
                      Book a consultation <ChevronRight className="h-4 w-4" />
                   </Link>
                </div>
             </motion.article>
           ))}
        </div>
      </section>

      {/* Grid of specialized programs */}
      <section className="py-32 bg-secondary/50 border-y border-border">
         <div className="mx-auto max-w-7xl px-4">
            <div className="text-center max-w-2xl mx-auto mb-20">
               <span className="text-primary font-bold uppercase tracking-widest text-[11px]">Extended Clinical Care</span>
               <h2 className="mt-4 text-4xl md:text-5xl font-bold text-primary tracking-tight">Specialized Focus Areas.</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
               {specialized.map((item, i) => (
                 <motion.div 
                   key={i} 
                   whileHover={{ y: -8 }}
                   className="bg-white rounded-[3rem] p-12 border border-border shadow-clinical transition-all group"
                 >
                    <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 text-primary flex items-center justify-center mb-8 transition-colors group-hover:bg-primary group-hover:text-white">
                       <item.icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-primary mb-4">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed mb-8">{item.desc}</p>
                    <Link to="/contact" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary no-underline transition-all hover:gap-4">
                       Inquire <ArrowRight className="h-4 w-4" />
                    </Link>
                 </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative overflow-hidden">
         <div className="absolute inset-0 bg-primary opacity-[0.03]" />
         <div className="mx-auto max-w-4xl px-4 text-center relative">
            <Microscope className="h-16 w-16 text-primary/10 mx-auto mb-10" />
            <h2 className="text-4xl md:text-6xl font-bold text-primary tracking-tight mb-8">Ready to define <br /> your care pathway?</h2>
            <p className="text-muted-foreground text-lg mb-12 max-w-xl mx-auto">Our clinical team is ready to structure a custom plan that fits your family's medical and personal requirements.</p>
            <div className="flex flex-wrap justify-center gap-4">
               <Link to="/contact" className="bg-primary text-white px-10 py-5 rounded-full font-bold text-sm shadow-premium hover:bg-primary/95 no-underline transition-all">
                  Contact Care Manager
               </Link>
               <Link to="/portal" className="border-2 border-primary/10 bg-white px-10 py-5 rounded-full font-bold text-sm text-primary no-underline transition-all hover:bg-secondary/50">
                  Visit Digital Hub
               </Link>
            </div>
         </div>
      </section>

      <SiteFooter />
    </div>
  );
}

