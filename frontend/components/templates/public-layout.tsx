import { SiteFooter } from "../molecules/site-footer";
import { SiteHeader } from "../molecules/site-header";

/** Layout publico: header, contenido y footer tecnico. */
export function PublicLayout({
  children,
  organizationSlug,
}: {
  children: React.ReactNode;
  organizationSlug?: string;
}) {
  return (
    <div className="dvl-shell min-h-screen">
      <SiteHeader organizationSlug={organizationSlug} />
      <main id="contenido">{children}</main>
      <SiteFooter />
    </div>
  );
}
