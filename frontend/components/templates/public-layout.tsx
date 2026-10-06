import { SiteFooter } from "../molecules/site-footer";
import { SiteHeader } from "../molecules/site-header";

/** Layout publico: header, contenido y footer tecnico. */
export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dvl-shell min-h-screen">
      <SiteHeader />
      <main id="contenido">{children}</main>
      <SiteFooter />
    </div>
  );
}
