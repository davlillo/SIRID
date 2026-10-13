"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { IconAction } from "@/components/atoms/icon-action";
import { ErrorState, LoadingBlock } from "@/components/atoms/states";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { useAuth } from "@/features/auth/auth-context";
import { cn } from "@/lib/cn";
import { KIND_LABEL, ZONE_LABEL } from "@/lib/format";
import type { Facility } from "@/lib/types";

import { FacilityForm } from "./facility-form";
import { useAdminFacilities } from "./hooks";
import { RateForm } from "./rate-form";
import { ScheduleEditor } from "./schedule-editor";

type Panel = "datos" | "horario" | "tarifa";

const PANELS: [Panel, string][] = [
  ["datos", "Datos"],
  ["horario", "Horario"],
  ["tarifa", "Tarifa"],
];

/**
 * Catalogo de instalaciones de una organizacion: tabla, alta/edicion y los
 * editores de horario y tarifa. La organizacion siempre es fija (la del
 * encargado o la que se abrio en el panel del administrador).
 */
export function FacilitiesManager({ organizationId }: { organizationId: string }) {
  const facilities = useAdminFacilities();
  const { canManageCatalog } = useAuth();
  const [editing, setEditing] = useState<Facility | null>(null);
  const [creating, setCreating] = useState(false);
  const [panel, setPanel] = useState<Panel>("datos");

  const items = (facilities.data?.items ?? []).filter(
    (facility) => facility.organization_id === organizationId,
  );

  function select(facility: Facility) {
    setCreating(false);
    setEditing(facility);
    setPanel("datos");
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <TechnicalLabel>CATALOG_ADMIN_01</TechnicalLabel>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em]">
            Instalaciones
          </h2>
        </div>
        {canManageCatalog ? (
          <Button
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
          >
            Nueva instalacion
          </Button>
        ) : null}
      </div>

      {facilities.isPending ? <div className="mt-8"><LoadingBlock /></div> : null}
      {facilities.isError ? (
        <div className="mt-8">
          <ErrorState description="No se pudo cargar el catalogo administrativo." />
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-2 xl:items-stretch">
        <section className="flex min-w-0 flex-col border border-charcoal/20 bg-ivory">
          <div className="border-b border-charcoal/15 px-4 py-3">
            <TechnicalLabel>CATALOGO</TechnicalLabel>
          </div>
          <table className="w-full table-fixed border-collapse text-sm">
            <caption className="sr-only">Instalaciones de la organización</caption>
            <thead>
              <tr className="bg-charcoal text-ivory">
                <th
                  scope="col"
                  className="w-[28%] px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                >
                  Nombre
                </th>
                <th
                  scope="col"
                  className="w-[16%] px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                >
                  Zona
                </th>
                <th
                  scope="col"
                  className="w-[22%] px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                >
                  Tipo
                </th>
                <th
                  scope="col"
                  className="w-[10%] px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                >
                  Cap.
                </th>
                <th
                  scope="col"
                  className="w-[14%] px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                >
                  Estado
                </th>
                <th
                  scope="col"
                  className="w-[10%] px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.14em]"
                >
                  Acc.
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((facility) => (
                <tr
                  key={facility.id}
                  onClick={() => select(facility)}
                  className={
                    editing?.id === facility.id
                      ? "cursor-pointer border-t border-charcoal/10 bg-sand"
                      : "cursor-pointer border-t border-charcoal/10 hover:bg-sand/40"
                  }
                >
                  <td className="truncate px-3 py-2.5 font-medium" title={facility.name}>
                    {facility.name}
                  </td>
                  <td className="truncate px-3 py-2.5">{ZONE_LABEL[facility.zone]}</td>
                  <td className="truncate px-3 py-2.5" title={KIND_LABEL[facility.facility_kind]}>
                    {KIND_LABEL[facility.facility_kind]}
                  </td>
                  <td className="px-3 py-2.5 font-mono">{facility.capacity}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        facility.is_active
                          ? "inline-block border border-olive px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-olive"
                          : "inline-block border border-charcoal/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-charcoal/50"
                      }
                    >
                      {facility.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end">
                      <IconAction
                        label={`Editar ${facility.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          select(facility);
                        }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </IconAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {facilities.isSuccess && items.length === 0 ? (
            <p className="border-t border-charcoal/10 px-4 py-6 text-sm text-charcoal/60">
              Esta organización todavía no tiene instalaciones.
            </p>
          ) : null}
        </section>

        <div className="min-h-full">
          {creating && canManageCatalog ? (
            <div className="h-full border border-charcoal bg-sand/30">
              <FacilityForm
                organizations={[]}
                fixedOrganizationId={organizationId}
                onDone={() => setCreating(false)}
              />
            </div>
          ) : editing ? (
            <div className="h-full border border-charcoal/20 bg-ivory">
              <div
                role="tablist"
                aria-label="Secciones de la instalación"
                className="flex gap-1 border-b border-charcoal/15 px-2"
              >
                {PANELS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={panel === value}
                    onClick={() => setPanel(value)}
                    className={cn(
                      "-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors duration-fast",
                      panel === value
                        ? "border-charcoal font-semibold text-charcoal"
                        : "border-transparent text-charcoal/60 hover:text-charcoal",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {panel === "datos" && canManageCatalog ? (
                  <FacilityForm
                    key={editing.id}
                    facility={editing}
                    organizations={[]}
                    fixedOrganizationId={organizationId}
                    onDone={() => setEditing(null)}
                  />
                ) : null}
                {panel === "horario" ? (
                  <ScheduleEditor key={`schedule-${editing.id}`} facility={editing} />
                ) : null}
                {panel === "tarifa" ? (
                  <RateForm key={`rate-${editing.id}`} facility={editing} />
                ) : null}
              </div>
            </div>
          ) : (
            <aside className="flex h-full min-h-[12rem] flex-col justify-center border border-dashed border-charcoal/25 bg-ivory/50 p-6">
              <TechnicalLabel>EDICION</TechnicalLabel>
              <p className="mt-3 text-sm leading-6 text-charcoal/60">
                Selecciona una fila o el icono de{" "}
                <strong className="font-semibold text-charcoal">lápiz</strong> para editar datos,
                horario y tarifas.
              </p>
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
