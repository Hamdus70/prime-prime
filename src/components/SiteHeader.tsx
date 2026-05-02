import { Link } from "@tanstack/react-router";
import { Phone, Menu, X, ChevronDown, UserCircle, Search, Facebook, Instagram, Linkedin, Globe, FileText, BookmarkCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { PrimeVitaLogo } from "./PrimeVitaLogo";

type NavItem = { to: "/" | "/about" | "/services" | "/contact" | "/portal"; label: string; hasDropdown?: boolean };
const nav: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/services", label: "Services", hasDropdown: true },
  { to: "/portal", label: "Digital Portal" },
  { to: "/contact", label: "Support" },
];

const serviceLinks = [
  { hash: "skilled-nursing", label: "Skilled Nursing" },
  { hash: "personal-caregiving", label: "Caregiving Services" },
  { hash: "physiotherapy", label: "Physiotherapy" },
  { hash: "post-operative", label: "Recovery Care" },
  { hash: "chronic-care", label: "Medical Support" },
  { hash: "dementia-care", label: "Dementia Care" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u));
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full shadow-clinical">
      {/* Utility Top Bar */}
      <div className="bg-[#003B2D] text-primary-foreground text-[10px] sm:text-[11px] font-medium tracking-wider uppercase">
        <div className="mx-auto max-w-7xl px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 overflow-hidden">
            <span className="hidden lg:inline whitespace-nowrap opacity-90 border-r border-primary-foreground/20 pr-6">PrimeVita Health Services</span>
            <div className="flex items-center gap-4">
              <Link to="/contact" className="hover:text-primary-foreground transition-colors flex items-center gap-1.5 no-underline">
                <BookmarkCheck className="h-3 w-3" /> Gov. Licensed
              </Link>
              <a href="#" className="hidden sm:flex items-center gap-1.5 hover:text-primary-foreground transition-colors no-underline">
                <FileText className="h-3 w-3" /> Brochure
              </a>
            </div>
          </div>
          <div className="flex items-center gap-5 shrink-0">
            <div className="hidden md:flex items-center gap-3 border-r border-primary-foreground/20 pr-5">
              <Facebook className="h-3.5 w-3.5 hover:opacity-75 cursor-pointer" />
              <Instagram className="h-3.5 w-3.5 hover:opacity-75 cursor-pointer" />
              <Linkedin className="h-3.5 w-3.5 hover:opacity-75 cursor-pointer" />
            </div>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1.5 hover:opacity-80 transition-colors">
                <Globe className="h-3 w-3" /> <span className="hidden xs:inline">Select Language</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="bg-white/95 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 shrink-0 no-underline group">
            <div className="bg-primary/5 p-1 rounded-xl border border-primary/10 group-hover:rotate-12 transition-transform">
              <PrimeVitaLogo className="h-10 w-10" />
            </div>
            <div className="hidden xs:block leading-tight pt-0.5">
              <div className="font-display text-xl font-bold text-primary italic serif">PrimeVita</div>
              <div className="text-[7px] tracking-[0.4em] uppercase text-muted-foreground/60 font-bold">Health Services</div>
            </div>
          </Link>

          {/* Search Bar - Hidden on mobile */}
          <div className="hidden lg:flex flex-1 max-w-sm ml-8">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input 
                type="text" 
                placeholder="Search services..." 
                className="w-full bg-secondary/50 border border-border rounded-full py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
              />
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-7 lg:gap-8 ml-auto">
            {nav.map(n => n.hasDropdown ? (
              <div key={n.to} className="relative group">
                <Link to={n.to} className="flex items-center gap-1 text-[13px] lg:text-sm font-semibold text-foreground/70 hover:text-primary transition-colors no-underline"
                  activeProps={{ className: "text-primary!" }}>
                  {n.label} <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
                </Link>
                <div className="absolute left-1/2 -translate-x-1/2 top-full pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform group-hover:translate-y-0 translate-y-1">
                  <div className="w-72 bg-white border border-border rounded-2xl shadow-premium overflow-hidden">
                    <div className="bg-primary/5 px-5 py-3 border-b border-border">
                      <p className="text-primary text-[10px] font-bold uppercase tracking-[0.15em]">Clinical Care Pathways</p>
                    </div>
                    <ul className="py-2.5">
                      {serviceLinks.map(s => (
                        <li key={s.hash}>
                          <Link to="/services" hash={s.hash} className="flex items-center gap-3 px-5 py-2.5 text-[13px] text-foreground/80 hover:bg-secondary hover:text-primary transition-colors no-underline">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary/20 group-hover:bg-primary" />
                            {s.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <Link key={n.to} to={n.to} className="text-[13px] lg:text-sm font-semibold text-foreground/70 hover:text-primary transition-colors no-underline"
                activeProps={{ className: "text-primary!" }} activeOptions={{ exact: n.to === "/" }}>
                {n.label}
              </Link>
            ))}
          </nav>

          {/* CTA / Auth */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden lg:block border-l border-border h-8 mx-4" />
            <div className="hidden xs:flex items-center gap-3">
              {user ? (
                <Link to="/portal" className="flex flex-col items-end no-underline group">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider group-hover:text-primary">Dashboard</span>
                  <div className="flex items-center gap-1.5 text-[13px] font-bold text-primary">
                    <UserCircle className="h-3.5 w-3.5" /> Portal
                  </div>
                </Link>
              ) : (
                <Link to="/contact" className="inline-flex items-center gap-2 rounded-full bg-primary text-white px-5 lg:px-6 py-2.5 text-[13px] font-bold shadow-clinical hover:shadow-premium transition-all hover:bg-primary/95 no-underline">
                  Contact Us
                </Link>
              )}
            </div>
            <button className="md:hidden p-2 text-primary" onClick={() => setOpen(!open)} aria-label="Menu">
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {open && (
          <div className="md:hidden border-t border-border bg-white animate-in slide-in-from-top duration-300">
            <div className="flex flex-col px-4 py-5 gap-4">
              {nav.map(n => n.hasDropdown ? (
                <div key={n.to}>
                  <button onClick={() => setMobileServicesOpen(v => !v)} className="w-full flex items-center justify-between py-2 text-sm font-bold text-foreground">
                    {n.label} <ChevronDown className={`h-4 w-4 transition-transform ${mobileServicesOpen ? "rotate-180" : ""}`} />
                  </button>
                  {mobileServicesOpen && (
                    <div className="pl-4 pb-2 flex flex-col gap-2 mt-2 border-l-2 border-primary/10 ml-1">
                      <Link to="/services" onClick={() => setOpen(false)} className="py-2 text-xs text-primary font-bold uppercase tracking-widest no-underline">Explore all</Link>
                      {serviceLinks.map(s => (
                        <Link key={s.hash} to="/services" hash={s.hash} onClick={() => setOpen(false)} className="py-2 text-[13px] text-muted-foreground no-underline">{s.label}</Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="py-2 text-sm font-bold text-foreground no-underline">{n.label}</Link>
              ))}
              <div className="pt-4 border-t border-border flex flex-col gap-3">
                 <Link to="/portal" onClick={() => setOpen(false)} className="inline-flex items-center justify-center rounded-full border-2 border-primary px-5 py-3 text-sm font-bold text-primary no-underline">Digital Portal</Link>
                 <Link to="/contact" onClick={() => setOpen(false)} className="inline-flex items-center justify-center rounded-full bg-primary text-white px-5 py-3 text-sm font-bold no-underline">Book Appointment</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

