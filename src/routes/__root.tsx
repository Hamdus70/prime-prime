import { Outlet, Link, createRootRoute } from "@tanstack/react-router";
import { BrandHeader, BrandFooter, WhatsAppFAB } from "@/components/BrandComponents";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-slate-900 font-display">404</h1>
        <h2 className="mt-4 text-xl font-bold text-slate-900 font-display italic serif">Node not found</h2>
        <p className="mt-2 text-sm text-muted-foreground font-medium">
          The clinical node you're attempting to access is either decommissioned or restricted.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl bg-primary text-white px-8 py-3 text-xs font-bold uppercase tracking-widest shadow-premium transition-all hover:bg-primary/95 no-underline"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <div className="min-h-screen flex flex-col pt-[80px]">
      <BrandHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <WhatsAppFAB />
      <BrandFooter />
    </div>
  );
}
