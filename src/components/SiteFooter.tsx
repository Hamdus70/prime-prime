import { Link, useLocation } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Twitter, MapPin, Phone, Mail, ArrowUpRight, GraduationCap, ShieldCheck } from "lucide-react";
import { PrimeVitaLogo } from "./PrimeVitaLogo";

export function SiteFooter() {
  const location = useLocation();
  const isPortal = location.pathname.startsWith("/portal");

  if (isPortal) return null;

  return (
    <footer className="bg-primary text-primary-foreground pt-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-16 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr] pb-16 border-b border-white/10">
          {/* Brand & Mission */}
          <div className="flex flex-col gap-6">
            <Link to="/" className="flex items-center gap-3 no-underline group">
              <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20 group-hover:rotate-6 transition-transform">
                <PrimeVitaLogo className="h-10 w-10" />
              </div>
              <div className="leading-tight">
                <div className="font-display text-2xl font-bold">PrimeVita</div>
                <div className="text-[9px] tracking-[0.25em] uppercase opacity-70">Health Services</div>
              </div>
            </Link>
            <p className="text-sm text-white/70 leading-relaxed max-w-xs">
              PrimeVita is dedicated to providing superior home-based clinical care, ensuring dignity and medical excellence for every family we serve.
            </p>
            <div className="flex gap-4">
              {[Facebook, Instagram, Linkedin, Twitter].map((Icon, i) => (
                <a key={i} href="#" className="h-10 w-10 rounded-full border border-white/10 hover:bg-white/10 grid place-items-center transition-all">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-8 text-white/50">Organization</h4>
            <ul className="space-y-4 text-[13px] font-medium text-white/80">
              <li><Link to="/" className="hover:text-white transition-colors no-underline flex items-center gap-2 group">Home <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" /></Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors no-underline flex items-center gap-2 group">About Us <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" /></Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors no-underline flex items-center gap-2 group">Our Services <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" /></Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors no-underline flex items-center gap-2 group">Contact <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" /></Link></li>
              <li><Link to="/portal" className="hover:text-white transition-colors no-underline flex items-center gap-2 group">Digital Hub <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" /></Link></li>
            </ul>
          </div>

          {/* Specializations */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-8 text-white/50">Care Pathways</h4>
            <ul className="space-y-4 text-[13px] font-medium text-white/80">
              <li className="cursor-pointer hover:text-white transition-colors">Skilled Nursing</li>
              <li className="cursor-pointer hover:text-white transition-colors">Dementia Support</li>
              <li className="cursor-pointer hover:text-white transition-colors">Palliative Care</li>
              <li className="cursor-pointer hover:text-white transition-colors">Geriatric Therapy</li>
              <li className="cursor-pointer hover:text-white transition-colors">Post-Op Rehab</li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-6 text-white">Direct Support</h4>
            <ul className="space-y-5 text-[13px] text-white/80">
              <li className="flex gap-4">
                <MapPin className="h-5 w-5 shrink-0 opacity-50" />
                <span className="leading-relaxed">12 Wellness Avenue, <br />Victoria Island, Lagos</span>
              </li>
              <li className="flex gap-4 border-t border-white/10 pt-4">
                <Phone className="h-5 w-5 shrink-0 opacity-50" />
                <span className="font-bold">+1 (800) PV-HEALTH</span>
              </li>
              <li className="flex gap-4 border-t border-white/10 pt-4">
                <Mail className="h-5 w-5 shrink-0 opacity-50" />
                <span>clinical@primevita.health</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Accreditations */}
        <div className="py-12 flex flex-wrap items-center justify-between gap-8">
           <div className="flex items-center gap-8 opacity-40 grayscale flex-wrap">
              <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-[10px]"><ShieldCheck className="h-4 w-4" /> Fully Licensed</div>
              <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-[10px]"><GraduationCap className="h-4 w-4" /> Board Certified Staff</div>
           </div>
           <div className="text-[11px] text-white/40 font-medium">
             © {new Date().getFullYear()} PrimeVita Health Services. All rights reserved. 
             <span className="mx-3 whitespace-nowrap">|</span> 
             <a href="#" className="hover:text-white no-underline transition-colors">Privacy Policy</a>
             <span className="mx-3 whitespace-nowrap">|</span> 
             <a href="#" className="hover:text-white no-underline transition-colors">Quality Standard</a>
           </div>
        </div>
      </div>
    </footer>
  );
}

