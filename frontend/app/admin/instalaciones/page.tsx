"use client";

import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { Field, Input, Select, Textarea } from "@/components/atoms/field";
import { ErrorState, LoadingBlock } from "@/components/atoms/states";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { AdminLayout } from "@/components/templates/admin-layout";
import {
  useAdminFacilities,
  useCreateRate,
  useSaveFacility,
  useSaveSchedules,
} from "@/features/admin/hooks";
import { useFacility } from "@/features/facilities/hooks";
import { KIND_LABEL, SPORT_LABEL, ZONE_LABEL, weekdayLabel } from "@/lib/format";
import type { Facility, FacilityKind, SportType, Zone } from "@/lib/types";

export default function AdminFacilitiesPage() {
  const facilities = useAdminFacilities();
  const [editing, setEditing] = useState<Facility | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <TechnicalLabel>CATALOG_ADMIN_01</TechnicalLabel>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">
            Instalaciones
          </h1>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
        >
          Nueva instalacion
        </Button>
      </div>

      {facilities.isPending ? <div className="mt-8"><LoadingBlock /></div> : null}
      {facilities.isError ? (
        <div className="mt-8">
          <ErrorState description="No se pudo cargar el catalogo administrativo." />
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_1fr] xl:items-start">
        <div className="overflow-x-auto border border-charcoal/20">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <caption className="sr-only">Instalaciones del complejo</caption>
            <thead>
              <tr className="bg-charcoal text-ivory">
                {["Nombre", "Zona", "Tipo", "Cap.", "Estado"].map((head) => (
                  <th
                    key={head}
                    scope="col"
                    className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facilities.data?.items.map((facility) => (
                <tr
                  key={facility.id}
                  onClick={() => {
                    setCreating(false);
                    setEditing(facility);
                  }}
                  className={
                    editing?.id === facility.id
                      ? "cursor-pointer border-t border-charcoal/10 bg-sand"
                      : "cursor-pointer border-t border-charcoal/10 hover:bg-sand/40"
                  }
                >
                  <td className="px-3 py-2.5 font-medium">{facility.name}</td>
                  <td className="px-3 py-2.5">{ZONE_LABEL[facility.zone]}</td>
                  <td className="px-3 py-2.5">{KIND_LABEL[facility.facility_kind]}</td>
                  <td className="px-3 py-2.5 font-mono">{facility.capacity}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        facility.is_active
                          ? "border border-olive px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-olive"
                          : "border border-charcoal/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-charcoal/50"
                      }
                    >
                      {facility.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          {creating ? (
            <FacilityForm onDone={() => setCreating(false)} />
          ) : editing ? (
            <>
              <FacilityForm facility={editing} onDone={() => setEditing(null)} />
              <ScheduleEditor facility={editing} />
              <RateForm facility={editing} />
            </>
          ) : (
            <aside className="border border-dashed border-charcoal/25 p-6">
              <TechnicalLabel>EDICION</TechnicalLabel>
              <p className="mt-3 text-sm text-charcoal/60">
                Selecciona una instalacion de la tabla para editar sus datos, su horario semanal
                y sus tarifas.
              </p>
            </aside>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function FacilityForm({ facility, onDone }: { facility?: Facility; onDone: () => void }) {
  const save = useSaveFacility();
  const isEdit = Boolean(facility);

  const [form, setForm] = useState({
    slug: facility?.slug ?? "",
    name: facility?.name ?? "",
    description: facility?.description ?? "",
    zone: (facility?.zone ?? "FUTBOL") as Zone,
    facility_kind: (facility?.facility_kind ?? "FIELD") as FacilityKind,
    sport_type: (facility?.sport_type ?? "FOOTBALL_7") as SportType,
    capacity: String(facility?.capacity ?? 10),
    location_label: facility?.location_label ?? "",
    surface: facility?.surface ?? "",
    is_bookable: facility?.is_bookable ?? true,
    is_active: facility?.is_active ?? true,
    map_x: facility?.map_x ?? "",
    map_z: facility?.map_z ?? "",
    map_width: facility?.map_width ?? "",
    map_depth: facility?.map_depth ?? "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body: Record<string, unknown> = {
      name: form.name,
      description: form.description,
      zone: form.zone,
      facility_kind: form.facility_kind,
      sport_type: form.sport_type,
      capacity: Number(form.capacity),
      location_label: form.location_label,
      surface: form.surface || null,
      is_bookable: form.is_bookable,
      is_active: form.is_active,
      map_x: form.map_x || null,
      map_y: "0",
      map_z: form.map_z || null,
      map_width: form.map_width || null,
      map_depth: form.map_depth || null,
    };
    if (!isEdit) body.slug = form.slug;

    await save.mutateAsync({ id: facility?.id, body });
    onDone();
  }

  return (
    <form onSubmit={submit} className="border border-charcoal bg-sand/30 p-5">
      <TechnicalLabel>{isEdit ? "EDITAR INSTALACION" : "NUEVA INSTALACION"}</TechnicalLabel>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {!isEdit ? (
          <Field
            label="Slug"
            htmlFor="fa-slug"
            hint="Solo minusculas y guiones. No se puede repetir."
            className="sm:col-span-2"
          >
            <Input
              id="fa-slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={form.slug}
              onChange={(event) => update("slug", event.target.value)}
              placeholder="cancha-norte-fut-7"
            />
          </Field>
        ) : null}

        <Field label="Nombre" htmlFor="fa-name" className="sm:col-span-2">
          <Input
            id="fa-name"
            required
            minLength={2}
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
          />
        </Field>

        <Field label="Descripcion" htmlFor="fa-desc" className="sm:col-span-2">
          <Textarea
            id="fa-desc"
            required
            minLength={10}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
          />
        </Field>

        <Field label="Zona" htmlFor="fa-zone">
          <Select
            id="fa-zone"
            value={form.zone}
            onChange={(event) => update("zone", event.target.value as Zone)}
          >
            {(Object.keys(ZONE_LABEL) as Zone[]).map((zone) => (
              <option key={zone} value={zone}>
                {ZONE_LABEL[zone]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Tipo" htmlFor="fa-kind">
          <Select
            id="fa-kind"
            value={form.facility_kind}
            onChange={(event) => update("facility_kind", event.target.value as FacilityKind)}
          >
            {(Object.keys(KIND_LABEL) as FacilityKind[]).map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABEL[kind]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Deporte o uso" htmlFor="fa-sport">
          <Select
            id="fa-sport"
            value={form.sport_type}
            onChange={(event) => update("sport_type", event.target.value as SportType)}
          >
            {(Object.keys(SPORT_LABEL) as SportType[]).map((sport) => (
              <option key={sport} value={sport}>
                {SPORT_LABEL[sport]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Capacidad" htmlFor="fa-cap">
          <Input
            id="fa-cap"
            type="number"
            min={1}
            required
            value={form.capacity}
            onChange={(event) => update("capacity", event.target.value)}
          />
        </Field>

        <Field label="Ubicacion" htmlFor="fa-loc">
          <Input
            id="fa-loc"
            required
            value={form.location_label}
            onChange={(event) => update("location_label", event.target.value)}
          />
        </Field>

        <Field label="Superficie" htmlFor="fa-surface">
          <Input
            id="fa-surface"
            value={form.surface}
            onChange={(event) => update("surface", event.target.value)}
            placeholder="SYNTHETIC_GRASS"
          />
        </Field>

        <fieldset className="sm:col-span-2">
          <legend className="font-mono text-[10px] uppercase tracking-[0.16em] text-olive">
            Coordenadas del plano 3D
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["map_x", "map_z", "map_width", "map_depth"] as const).map((key) => (
              <Field key={key} label={key.replace("map_", "")} htmlFor={`fa-${key}`}>
                <Input
                  id={`fa-${key}`}
                  type="number"
                  step="0.5"
                  value={form[key] ?? ""}
                  onChange={(event) => update(key, event.target.value)}
                />
              </Field>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_bookable}
            onChange={(event) => update("is_bookable", event.target.checked)}
            className="h-4 w-4 accent-terracotta"
          />
          Reservable
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) => update("is_active", event.target.checked)}
            className="h-4 w-4 accent-terracotta"
          />
          Activa en el catalogo
        </label>
      </div>

      <div className="mt-5 flex gap-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear instalacion"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cerrar
        </Button>
      </div>
    </form>
  );
}

type ScheduleDraft = { weekday: number; enabled: boolean; opens_at: string; closes_at: string };

function ScheduleEditor({ facility }: { facility: Facility }) {
  const detail = useFacility(facility.slug);
  const save = useSaveSchedules();
  const [draft, setDraft] = useState<ScheduleDraft[] | null>(null);

  const rows =
    draft ??
    Array.from({ length: 7 }, (_, weekday) => {
      const existing = detail.data?.schedules.find(
        (schedule) => schedule.weekday === weekday && schedule.is_active,
      );
      return {
        weekday,
        enabled: Boolean(existing),
        opens_at: existing?.opens_at.slice(0, 5) ?? "06:00",
        closes_at: existing?.closes_at.slice(0, 5) ?? "22:00",
      };
    });

  function update(weekday: number, patch: Partial<ScheduleDraft>) {
    setDraft(rows.map((row) => (row.weekday === weekday ? { ...row, ...patch } : row)));
  }

  return (
    <section className="border border-charcoal/20 bg-ivory p-5">
      <TechnicalLabel>HORARIO SEMANAL</TechnicalLabel>
      {detail.isPending ? (
        <div className="mt-3">
          <LoadingBlock />
        </div>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {rows.map((row) => (
              <li key={row.weekday} className="flex flex-wrap items-center gap-3">
                <label className="flex w-32 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(event) => update(row.weekday, { enabled: event.target.checked })}
                    className="h-4 w-4 accent-terracotta"
                  />
                  {weekdayLabel(row.weekday)}
                </label>
                <input
                  type="time"
                  aria-label={`Apertura ${weekdayLabel(row.weekday)}`}
                  value={row.opens_at}
                  disabled={!row.enabled}
                  onChange={(event) => update(row.weekday, { opens_at: event.target.value })}
                  className="min-h-11 border border-charcoal/25 bg-ivory px-2 text-sm disabled:opacity-40"
                />
                <span aria-hidden="true" className="text-charcoal/40">
                  –
                </span>
                <input
                  type="time"
                  aria-label={`Cierre ${weekdayLabel(row.weekday)}`}
                  value={row.closes_at}
                  disabled={!row.enabled}
                  onChange={(event) => update(row.weekday, { closes_at: event.target.value })}
                  className="min-h-11 border border-charcoal/25 bg-ivory px-2 text-sm disabled:opacity-40"
                />
              </li>
            ))}
          </ul>

          <Button
            className="mt-4"
            size="sm"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                id: facility.id,
                schedules: rows
                  .filter((row) => row.enabled)
                  .map((row) => ({
                    weekday: row.weekday,
                    opens_at: `${row.opens_at}:00`,
                    closes_at: `${row.closes_at}:00`,
                    is_active: true,
                  })),
              })
            }
          >
            {save.isPending ? "Guardando…" : "Guardar horario"}
          </Button>
        </>
      )}
    </section>
  );
}

function RateForm({ facility }: { facility: Facility }) {
  const detail = useFacility(facility.slug);
  const create = useCreateRate();
  const [form, setForm] = useState({
    name: "",
    amount: "",
    minimum_minutes: "60",
    valid_from: new Date().toISOString().slice(0, 10),
  });

  return (
    <section className="border border-charcoal/20 bg-ivory p-5">
      <TechnicalLabel>TARIFAS</TechnicalLabel>

      <ul className="mt-3 space-y-1 font-mono text-xs">
        {detail.data?.rates.length === 0 ? (
          <li className="text-charcoal/55">Sin tarifas registradas.</li>
        ) : null}
        {detail.data?.rates.map((rate) => (
          <li key={rate.id} className="flex justify-between gap-3">
            <span className="truncate">{rate.name}</span>
            <span>
              {rate.amount} {rate.currency} / {rate.minimum_minutes}m
              {rate.is_active ? "" : " (inactiva)"}
            </span>
          </li>
        ))}
      </ul>

      <form
        className="mt-4 grid gap-3 border-t border-charcoal/10 pt-4 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          await create.mutateAsync({
            id: facility.id,
            body: {
              name: form.name,
              amount: form.amount,
              currency: "USD",
              minimum_minutes: Number(form.minimum_minutes),
              valid_from: form.valid_from,
              is_active: true,
            },
          });
          setForm((current) => ({ ...current, name: "", amount: "" }));
        }}
      >
        <Field label="Nombre" htmlFor="rate-name">
          <Input
            id="rate-name"
            required
            minLength={2}
            value={form.name}
            onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))}
          />
        </Field>
        <Field label="Importe" htmlFor="rate-amount">
          <Input
            id="rate-amount"
            type="number"
            step="0.01"
            min={0}
            required
            value={form.amount}
            onChange={(event) => setForm((c) => ({ ...c, amount: event.target.value }))}
          />
        </Field>
        <Field label="Bloque (min)" htmlFor="rate-min">
          <Input
            id="rate-min"
            type="number"
            min={15}
            step={15}
            required
            value={form.minimum_minutes}
            onChange={(event) => setForm((c) => ({ ...c, minimum_minutes: event.target.value }))}
          />
        </Field>
        <Field label="Vigente desde" htmlFor="rate-from">
          <Input
            id="rate-from"
            type="date"
            required
            value={form.valid_from}
            onChange={(event) => setForm((c) => ({ ...c, valid_from: event.target.value }))}
          />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={create.isPending}>
            {create.isPending ? "Guardando…" : "Agregar tarifa"}
          </Button>
        </div>
      </form>
    </section>
  );
}
