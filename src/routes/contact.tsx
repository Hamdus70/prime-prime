import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — PrimeVita Health Services" },
      { name: "description", content: "Reach the PrimeVita care team. Free 30-minute consultation. Available 24/7." },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="bg-gradient-soft py-20">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest">Get in Touch</p>
          <h1 className="mt-3 text-5xl md:text-6xl font-semibold text-deep text-balance">We're ready when you are.</h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Tell us about your needs. A care manager will reach out within 24 hours — no commitment, no obligation.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-[1fr_1.3fr] gap-10">
          <div className="space-y-4">
            {[
              { icon: Phone, title: "Call us", value: "+1 (800) 555-1234", sub: "24/7 care line" },
              { icon: Mail, title: "Email", value: "hello@primevita.health", sub: "Replies within 4 hours" },
              { icon: MapPin, title: "Visit", value: "12 Wellness Avenue, Lagos", sub: "By appointment" },
              { icon: Clock, title: "Hours", value: "Always available", sub: "Care doesn't sleep — neither do we" },
            ].map((c, i) => (
              <div key={i} className="bg-card rounded-2xl p-6 border border-border shadow-soft flex gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-primary text-primary-foreground grid place-items-center shrink-0">
                  <c.icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.title}</div>
                  <div className="text-lg font-semibold text-deep">{c.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); alert("Thank you — we'll be in touch within 24 hours."); }}
            className="bg-card rounded-3xl p-8 border border-border shadow-soft"
          >
            <h2 className="text-2xl font-semibold text-deep">Request a free consultation</h2>
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <Field label="First name" />
              <Field label="Last name" />
              <Field label="Email" type="email" />
              <Field label="Phone" type="tel" />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">Type of care needed</label>
              <select className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option>Skilled Nursing</option>
                <option>Personal Caregiving</option>
                <option>Physiotherapy</option>
                <option>Post-Operative Care</option>
                <option>Other / Not sure</option>
              </select>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-foreground/80 mb-1.5">Tell us about your situation</label>
              <textarea rows={5} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <button type="submit" className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-7 py-3.5 text-sm font-semibold shadow-glow hover:opacity-95 transition">
              Send Message <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Field({ label, type = "text" }: { label: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground/80 mb-1.5">{label}</label>
      <input type={type} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}
