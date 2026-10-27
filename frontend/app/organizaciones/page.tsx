import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { PublicLayout } from "@/components/templates/public-layout";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { getServerSession, serverRequest } from "@/lib/server-session";
import type { PublicOrganization } from "@/lib/types";

export const metadata: Metadata = {
  title: "Organizaciones",
  description: "Selecciona una organización para ver sus instalaciones deportivas.",
};

export default async function OrganizationsPage() {
  const user = await getServerSession();
  if (user?.role === "CLIENT") {
    if (!user.organization_id) notFound();
    redirect(`/instalaciones?organization=${encodeURIComponent(user.organization_id)}`);
  }
  let organizations: PublicOrganization[] = [];
  let loadFailed = false;
  try {
    organizations = await serverRequest<PublicOrganization[]>("/organizations");
  } catch {
    loadFailed = true;
  }

  return (
    <PublicLayout>
      <section className="sirid-page-banner my-6 px-7 py-14 sm:px-12 md:py-20">
        <TechnicalLabel>ENCUENTRA TU ORGANIZACIÓN</TechnicalLabel>
        <h1 className="dvl-display mt-4">Elige tu organización.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-charcoal/70">
          Cada organización administra sus propias instalaciones y reservas. El catálogo público
          muestra únicamente los espacios de la organización que selecciones.
        </p>
      </section>

      {organizations.length ? (
        <ul className="grid gap-5 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((organization) => (
            <li key={organization.id}>
              <Link
                href={`/instalaciones?organization=${encodeURIComponent(organization.slug)}`}
                className="sirid-panel sirid-organization-card group flex h-full min-h-52 flex-col p-7 transition-all duration-base hover:-translate-y-1 hover:border-terracotta/60 hover:shadow-lg focus-visible:outline-terracotta"
              >
                <TechnicalLabel>{organization.slug.toUpperCase()}</TechnicalLabel>
                <h2 className="mt-3 break-words font-display text-2xl font-semibold">{organization.name}</h2>
                <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-terracotta">
                  Ver instalaciones <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="sirid-panel mb-12 border-dashed px-6 py-10 text-center">
          <h2 className="font-display text-xl font-semibold">
            {loadFailed ? "No pudimos cargar las organizaciones" : "Pronto habrá más espacios por descubrir"}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-charcoal/70">
            {loadFailed
              ? "El servicio no está disponible por el momento. Intenta nuevamente en unos minutos."
              : "No hay organizaciones activas disponibles por el momento."}
          </p>
          {loadFailed ? (
            <a href="/organizaciones" className="mt-5 inline-flex min-h-11 items-center rounded-full border border-charcoal/20 px-5 text-sm font-semibold hover:bg-sand">
              Volver a intentar
            </a>
          ) : null}
        </div>
      )}
    </PublicLayout>
  );
}
