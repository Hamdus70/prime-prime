import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { ShieldCheck, User, ClipboardList, Activity, Heart, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { BrandContextBanner } from "@/components/BrandComponents";

export const Route = createFileRoute("/assessment")({
  component: AssessmentPage,
});

function AssessmentPage() {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const steps = [
    { id: 1, label: "Identity", icon: User },
    { id: 2, label: "Clinical Profile", icon: Activity },
    { id: 3, label: "Functional Ability", icon: ClipboardList },
    { id: 4, label: "Preferences", icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-slate-50/30">
      <BrandContextBanner size="slim" />
      
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/5 border border-primary/10 rounded-full text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-6"
          >
            <ShieldCheck className="h-4 w-4 text-accent" /> Secure Clinical Portal
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-bold text-primary tracking-tight font-display mb-4 italic serif">Client Intake <span className="text-muted-foreground/30">Assessment.</span></h1>
          <p className="text-muted-foreground font-medium max-w-xl mx-auto">Please complete the following clinical evaluation. Your data is encrypted and protected under healthcare privacy standards.</p>
        </div>

        {/* Progress Bar */}
        <div className="relative mb-20">
          <div className="absolute top-1/2 left-0 w-full h-px bg-slate-200 -translate-y-1/2" />
          <div className="relative flex justify-between">
            {steps.map((s) => (
              <div key={s.id} className="relative flex flex-col items-center">
                <div 
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                    step >= s.id 
                    ? "bg-primary text-white border-primary shadow-glow" 
                    : "bg-white text-slate-400 border-slate-100 shadow-sm"
                  }`}
                >
                  <s.icon className="h-5 w-5" />
                </div>
                <span className={`absolute top-16 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
                  step === s.id ? "text-primary" : "text-muted-foreground/50"
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 shadow-clinical relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-accent" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              {step === 1 && (
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="col-span-full">
                    <h2 className="text-2xl font-bold text-primary italic serif mb-2">Personal Identity</h2>
                    <p className="text-sm text-muted-foreground font-medium">Verified information for clinical documentation.</p>
                  </div>
                  <InputField label="Patient Full Name" placeholder="e.g. John Doe" required />
                  <InputField label="Age" placeholder="Years" />
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/60">Gender</label>
                    <div className="flex gap-4">
                      <RadioOption label="Male" name="gender" />
                      <RadioOption label="Female" name="gender" />
                      <RadioOption label="Other" name="gender" />
                    </div>
                  </div>
                  <InputField label="Email Address" placeholder="email@example.com" required />
                  <InputField label="Phone Number" placeholder="+234..." required />
                  <div className="col-span-full">
                    <InputField label="Residential Address" placeholder="Full street address" />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="col-span-full">
                    <h2 className="text-2xl font-bold text-primary italic serif mb-2">Clinical Profile</h2>
                    <p className="text-sm text-muted-foreground font-medium">History and biometric data for medical planning.</p>
                  </div>
                  <TextAreaField label="Medical History" placeholder="Previous diagnoses, chronic conditions..." />
                  <TextAreaField label="Surgical History" placeholder="Recent operations and dates..." />
                  <InputField label="Weight (kg)" placeholder="e.g. 75" />
                  <InputField label="Height (cm)" placeholder="e.g. 180" />
                  <TextAreaField label="Allergies" placeholder="Food, drug, or environmental allergies..." />
                  <TextAreaField label="Current Medications" placeholder="List all drugs being taken..." />
                </div>
              )}

              {step === 3 && (
                <div className="grid md:grid-cols-1 gap-12">
                  <div className="col-span-full">
                    <h2 className="text-2xl font-bold text-primary italic serif mb-2">Functional Evaluation</h2>
                    <p className="text-sm text-muted-foreground font-medium">Assessment of Activities of Daily Living (ADL).</p>
                  </div>
                  <div className="space-y-8">
                    <SelectField label="Mobility Status" options={["Unassisted", "Use walking aid", "Wheelchair", "Bedridden"]} />
                    <SelectField label="Transfer Ability (Bed to Chair)" options={["Independent", "Minimal Assistance", "Maximum Assistance", "Dependent"]} />
                    <SelectField label="Bathing / Personal Hygiene" options={["Self", "Needs help", "Full assistance"]} />
                    <SelectField label="Continency (Bowels/Bladder)" options={["Continent", "Occasional accidents", "Incontinent"]} />
                    <SelectField label="Orientation / Cognitive Status" options={["Alert & Oriented", "Confused", "Memory issues", "Dementia"]} />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="col-span-full">
                    <h2 className="text-2xl font-bold text-primary italic serif mb-2">Service Preferences</h2>
                    <p className="text-sm text-muted-foreground font-medium">Tailoring the care plan to your specific needs.</p>
                  </div>
                  <div className="col-span-full space-y-4">
                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/60">Preferred Services</label>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {["Dementia Care", "Physiotherapy", "Travel Nurse", "Post-Surgical", "Geriatric Care", "Paediatric"].map(s => (
                        <CheckboxOption key={s} label={s} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/60">Preferred Staff Gender</label>
                    <div className="flex gap-4">
                      <RadioOption label="No Preference" name="staff_gender" />
                      <RadioOption label="Male" name="staff_gender" />
                      <RadioOption label="Female" name="staff_gender" />
                    </div>
                  </div>
                  <InputField label="Proposed Start Date" type="date" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-16 pt-8 border-t border-slate-100 flex items-center justify-between">
            <button 
              onClick={prevStep}
              disabled={step === 1}
              className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[10px] disabled:opacity-20 hover:translate-x-[-4px] transition-transform"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            
            {step < totalSteps ? (
              <button 
                onClick={nextStep}
                className="bg-primary text-white pl-8 pr-10 py-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-[11px] shadow-premium hover:shadow-glow transition-all flex items-center gap-3"
              >
                Continue Assessment <ArrowRight className="h-4 w-4 text-accent" />
              </button>
            ) : (
              <button 
                onClick={() => alert("Assessment Submitted. Our clinical team will contact you shortly.")}
                className="bg-emerald-600 text-white pl-8 pr-10 py-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-[11px] shadow-premium hover:shadow-glow transition-all flex items-center gap-3"
              >
                Finalize & Submit <CheckCircle2 className="h-4 w-4 text-accent" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">In case of emergency, contact <span className="font-bold text-primary">+2347012918331</span> immediately</span>
            </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, placeholder, type = "text", required = false }: any) {
  return (
    <div className="space-y-3">
      <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/60">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input 
        type={type} 
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all"
      />
    </div>
  );
}

function TextAreaField({ label, placeholder }: any) {
  return (
    <div className="space-y-3 col-span-full">
      <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/60">{label}</label>
      <textarea 
        placeholder={placeholder}
        rows={3}
        className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 focus:bg-white transition-all resize-none"
      />
    </div>
  );
}

function RadioOption({ label, name }: any) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input type="radio" name={name} className="accent-primary h-4 w-4" />
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-primary transition-colors">{label}</span>
    </label>
  );
}

function CheckboxOption({ label }: any) {
  return (
    <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer hover:border-primary/20 transition-all group">
      <input type="checkbox" className="accent-primary h-4 w-4" />
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-primary transition-colors">{label}</span>
    </label>
  );
}

function SelectField({ label, options }: any) {
  return (
    <div className="space-y-4">
      <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/60">{label}</label>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {options.map((opt: string) => (
          <label key={opt} className="relative cursor-pointer group">
            <input type="radio" name={label} className="peer hidden" />
            <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm text-center transition-all peer-checked:bg-primary/5 peer-checked:border-primary peer-checked:shadow-md hover:border-primary/20">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 peer-checked:text-primary">{opt}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
