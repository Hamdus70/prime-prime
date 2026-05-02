import { ShieldCheck, Heart } from "lucide-react";

export function PrimeVitaLogo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <img 
      src="https://www.image2url.com/r2/default/images/1777555814683-2ec475ac-ba95-4d15-87fd-46f73a68b6ae.png" 
      alt="PrimeVita Logo" 
      className={`${className} object-contain`}
    />
  );
}
