import { SiteFooter } from "../molecules/site-footer";
import { SiteHeader } from "../molecules/site-header";

/** Layout publico: header, contenido y footer tecnico. */
export function PublicLayout({
  children,
  organizationSlug,
  home = false,
}: {
  children: React.ReactNode;
  organizationSlug?: string;
  home?: boolean;
}) {
  return (
    <div className={`dvl-shell min-h-dvh${home ? " sirid-home-shell" : ""}`}>
      <SiteHeader organizationSlug={organizationSlug} />
      <main id="contenido">{children}</main>
      <SiteFooter />
    </div>
  );
}
