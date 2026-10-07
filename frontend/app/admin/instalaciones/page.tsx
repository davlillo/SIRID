"use client";

import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { Field, Input, Select, Textarea } from "@/components/atoms/field";
import { Modal } from "@/components/atoms/modal";
import { ErrorState, LoadingBlock } from "@/components/atoms/states";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { AdminLayout } from "@/components/templates/admin-layout";
import {
  useAdminFacility,
  useAdminFacilities,
  useCreateRate,
  usePublishRate,
  useSaveFacility,
  useSaveSchedules,
} from "@/features/admin/hooks";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { KIND_LABEL, SPORT_LABEL, ZONE_LABEL, weekdayLabel } from "@/lib/format";
import type { Facility, FacilityKind, SportType, Zone } from "@/lib/types";

export default function AdminFacilitiesPage() {
  const facilities = useAdminFacilities();
  const { canManageCatalog } = useAuth();
  const [editing, setEditing] = useState<Facility | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <AdminLayout access="catalog">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <TechnicalLabel>CATALOG_ADMIN_01</TechnicalLabel>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">
            Instalaciones
          </h1>
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
          {creating && canManageCatalog ? (
            <FacilityForm onDone={() => setCreating(false)} />
          ) : editing ? (
            <>
              {canManageCatalog ? (
                <>
                  <FacilityForm
                    key={editing.id}
                    facility={editing}
                    onDone={() => setEditing(null)}
                  />
                  <ScheduleEditor key={`schedule-${editing.id}`} facility={editing} />
                </>
              ) : null}
              <RateForm key={`rate-${editing.id}`} facility={editing} />
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

type RangeDraft = { key: string; opens_at: string; closes_at: string; slot_minutes: number };
type WeekDraft = RangeDraft[][]; // indice = weekday (lunes = 0)

const SLOT_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240];
const MINUTES_PER_DAY = 24 * 60;

let rangeSeq = 0;
function newKey(): string {
  rangeSeq += 1;
  return `range-${rangeSeq}`;
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

/** `00:00` como cierre es medianoche al final del dia. */
function closeMinutes(value: string): number {
  return value === "00:00" ? MINUTES_PER_DAY : toMinutes(value);
}

function fromMinutes(total: number): string {
  const clamped = Math.min(total, MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = String(Math.floor(clamped / 60)).padStart(2, "0");
  const minutes = String(clamped % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** Errores por rango y avisos generales. Con errores no se permite guardar. */
function validateWeek(week: WeekDraft): { invalid: Set<string>; messages: string[] } {
  const invalid = new Set<string>();
  const messages: string[] = [];

  week.forEach((ranges, weekday) => {
    const day = weekdayLabel(weekday);
    ranges.forEach((range) => {
      const start = toMinutes(range.opens_at);
      const end = closeMinutes(range.closes_at);
      const label = `${range.opens_at}-${range.closes_at}`;
      if (end <= start) {
        invalid.add(range.key);
        messages.push(`El horario del ${day} ${label} debe cerrar despues de abrir.`);
      } else if (end - start < range.slot_minutes) {
        invalid.add(range.key);
        messages.push(
          `El horario del ${day} ${label} es mas corto que un bloque de ${range.slot_minutes} minutos.`,
        );
      }
    });

    for (let i = 0; i < ranges.length; i += 1) {
      for (let j = i + 1; j < ranges.length; j += 1) {
        const a = ranges[i];
        const b = ranges[j];
        if (
          toMinutes(a.opens_at) < closeMinutes(b.closes_at) &&
          toMinutes(b.opens_at) < closeMinutes(a.closes_at)
        ) {
          invalid.add(a.key);
          invalid.add(b.key);
          messages.push(
            `Los horarios del ${day} ${a.opens_at}-${a.closes_at} y ${b.opens_at}-${b.closes_at} se superponen.`,
          );
        }
      }
    }
  });

  return { invalid, messages };
}

function ScheduleEditor({ facility }: { facility: Facility }) {
  const detail = useAdminFacility(facility.id);
  const save = useSaveSchedules();
  const [draft, setDraft] = useState<WeekDraft | null>(null);

  const week: WeekDraft =
    draft ??
    Array.from({ length: 7 }, (_, weekday) =>
      (detail.data?.schedules ?? [])
        .filter((schedule) => schedule.weekday === weekday && schedule.is_active)
        .sort((left, right) => left.opens_at.localeCompare(right.opens_at))
        .map((schedule) => ({
          key: schedule.id,
          opens_at: schedule.opens_at.slice(0, 5),
          closes_at: schedule.closes_at.slice(0, 5),
          slot_minutes: schedule.slot_minutes,
        })),
    );

  const today = localDateInput();
  const rateMinutes = (detail.data?.rates ?? []).find(
    (rate) =>
      rate.is_active && rate.valid_from <= today && (!rate.valid_until || rate.valid_until >= today),
  )?.minimum_minutes;

  const { invalid, messages } = validateWeek(week);
  const serverError =
    save.error instanceof ApiError && save.error.status === 422 ? save.error.detail : null;

  function setDay(weekday: number, ranges: RangeDraft[]) {
    save.reset();
    setDraft(week.map((current, index) => (index === weekday ? ranges : current)));
  }

  function updateRange(weekday: number, key: string, patch: Partial<RangeDraft>) {
    setDay(
      weekday,
      week[weekday].map((range) => (range.key === key ? { ...range, ...patch } : range)),
    );
  }

  function addRange(weekday: number) {
    const ranges = week[weekday];
    const last = ranges[ranges.length - 1];
    const slot = last?.slot_minutes ?? rateMinutes ?? 60;
    const opens = last ? closeMinutes(last.closes_at) : toMinutes("08:00");
    const closes = Math.min(opens + Math.max(slot, 120), MINUTES_PER_DAY);
    setDay(weekday, [
      ...ranges,
      { key: newKey(), opens_at: fromMinutes(opens), closes_at: fromMinutes(closes), slot_minutes: slot },
    ]);
  }

  function copyToAll(weekday: number) {
    save.reset();
    setDraft(
      week.map((_, index) =>
        week[weekday].map((range) => ({ ...range, key: index === weekday ? range.key : newKey() })),
      ),
    );
  }

  function submit() {
    save.mutate({
      id: facility.id,
      schedules: week.flatMap((ranges, weekday) =>
        ranges.map((range) => ({
          weekday,
          opens_at: `${range.opens_at}:00`,
          closes_at: `${range.closes_at}:00`,
          slot_minutes: range.slot_minutes,
          is_active: true,
        })),
      ),
    });
  }

  const warnings = serverError ? [...messages, serverError] : messages;

  return (
    <section className="border border-charcoal/20 bg-ivory p-5">
      <TechnicalLabel>HORARIO SEMANAL</TechnicalLabel>
      <p className="mt-1 text-sm text-charcoal/60">
        Define uno o varios rangos por dia y cuanto dura cada prestamo. Un cierre a las 00:00
        significa medianoche.
      </p>

      {detail.isPending ? (
        <div className="mt-3">
          <LoadingBlock />
        </div>
      ) : (
        <>
          {warnings.length > 0 ? (
            <div
              role="alert"
              className="mt-4 border border-state-error/40 bg-state-error/5 p-3 text-sm text-state-error"
            >
              <strong className="block font-semibold">
                Revisa el horario antes de guardar
              </strong>
              <ul className="mt-1 list-disc pl-5">
                {warnings.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <ul className="mt-4 space-y-4">
            {week.map((ranges, weekday) => (
              <li key={weekday} className="border-t border-charcoal/10 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{weekdayLabel(weekday)}</span>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => addRange(weekday)}>
                      + Agregar rango
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToAll(weekday)}
                    >
                      Copiar a todos los dias
                    </Button>
                  </div>
                </div>

                {ranges.length === 0 ? (
                  <p className="mt-1 text-xs text-charcoal/50">Cerrado</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {ranges.map((range) => {
                      const hasError = invalid.has(range.key);
                      const control = cn(
                        "min-h-11 border bg-ivory px-2 text-sm",
                        hasError ? "border-state-error" : "border-charcoal/25",
                      );
                      const slotOptions = SLOT_OPTIONS.includes(range.slot_minutes)
                        ? SLOT_OPTIONS
                        : [...SLOT_OPTIONS, range.slot_minutes].sort((a, b) => a - b);
                      return (
                        <li key={range.key}>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="time"
                              aria-label={`Apertura ${weekdayLabel(weekday)}`}
                              value={range.opens_at}
                              onChange={(event) =>
                                updateRange(weekday, range.key, { opens_at: event.target.value })
                              }
                              className={control}
                            />
                            <span aria-hidden="true" className="text-charcoal/40">
                              –
                            </span>
                            <input
                              type="time"
                              aria-label={`Cierre ${weekdayLabel(weekday)}`}
                              value={range.closes_at}
                              onChange={(event) =>
                                updateRange(weekday, range.key, { closes_at: event.target.value })
                              }
                              className={control}
                            />
                            <select
                              aria-label={`Duracion del prestamo ${weekdayLabel(weekday)}`}
                              value={range.slot_minutes}
                              onChange={(event) =>
                                updateRange(weekday, range.key, {
                                  slot_minutes: Number(event.target.value),
                                })
                              }
                              className={control}
                            >
                              {slotOptions.map((minutes) => (
                                <option key={minutes} value={minutes}>
                                  Bloques de {minutesLabel(minutes)}
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setDay(
                                  weekday,
                                  ranges.filter((item) => item.key !== range.key),
                                )
                              }
                            >
                              Quitar
                            </Button>
                          </div>
                          {rateMinutes && range.slot_minutes % rateMinutes !== 0 ? (
                            <p className="mt-1 text-xs text-charcoal/60">
                              La tarifa cobra bloques de {minutesLabel(rateMinutes)}: cada prestamo
                              de {minutesLabel(range.slot_minutes)} se cobra redondeando hacia arriba.
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <Button
            className="mt-5"
            size="sm"
            disabled={save.isPending || messages.length > 0}
            onClick={submit}
          >
            {save.isPending ? "Guardando…" : "Guardar horario"}
          </Button>
        </>
      )}
    </section>
  );
}

function RateForm({ facility }: { facility: Facility }) {
  const detail = useAdminFacility(facility.id);
  const create = useCreateRate();
  const publish = usePublishRate();
  const today = localDateInput();
  const applicableRates = (detail.data?.rates ?? [])
    .filter(
      (rate) =>
        rate.is_active &&
        rate.valid_from <= today &&
        (!rate.valid_until || rate.valid_until >= today),
    )
    .sort(
      (left, right) =>
        right.valid_from.localeCompare(left.valid_from) ||
        Number(left.amount) - Number(right.amount),
    );
  const currentRate = applicableRates[0];
  const historicalRates = (detail.data?.rates ?? []).filter(
    (rate) => rate.id !== currentRate?.id,
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [update, setUpdate] = useState<{
    amount: string;
    effective_from: string;
    // `null` = conservar el tiempo de la tarifa vigente hasta que se edite.
    minimum_minutes: string | null;
  }>({
    amount: "",
    effective_from: today,
    minimum_minutes: null,
  });
  const [form, setForm] = useState({
    name: "",
    amount: "",
    minimum_minutes: "60",
    valid_from: today,
  });

  return (
    <section className="border border-charcoal/20 bg-ivory p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <TechnicalLabel>TARIFA DE {facility.name}</TechnicalLabel>
          <h2 className="mt-2 font-display text-2xl font-semibold">Precio de reservación</h2>
        </div>
        {currentRate ? (
          <div className="border-l-2 border-terracotta pl-4 text-right">
            <span className="block text-xs text-charcoal/55">Tarifa vigente</span>
            <strong className="font-display text-3xl font-semibold tabular-nums">
              ${Number(currentRate.amount).toFixed(2)}
            </strong>
            <span className="block text-xs text-charcoal/55">
              por {currentRate.minimum_minutes} minutos
            </span>
          </div>
        ) : null}
      </div>

      {detail.isPending ? <div className="mt-5"><LoadingBlock /></div> : null}

      {currentRate ? (
        <form
          className="mt-6 border-t border-charcoal/10 pt-5"
          onSubmit={async (event) => {
            event.preventDefault();
            await publish.mutateAsync({
              id: facility.id,
              amount: update.amount,
              effectiveFrom: update.effective_from,
              minimumMinutes: Number(
                update.minimum_minutes ?? currentRate.minimum_minutes,
              ),
            });
            setUpdate((current) => ({ ...current, amount: "", minimum_minutes: null }));
          }}
        >
          <TechnicalLabel>ACTUALIZAR TARIFA</TechnicalLabel>
          <p className="mt-1 max-w-xl text-sm text-charcoal/60">
            Indica el nuevo precio y desde cuándo aplica. El precio anterior queda en el
            historial y las reservas ya hechas conservan su valor.
          </p>
          <div className="mt-4 grid items-start gap-x-4 gap-y-5 sm:grid-cols-2">
            <Field
              label="Nuevo precio (USD)"
              htmlFor="rate-update-amount"
              hint="Usa hasta dos decimales."
            >
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-charcoal/50"
                >
                  $
                </span>
                <Input
                  id="rate-update-amount"
                  className="pl-7 font-mono text-base tabular-nums"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0.01}
                  max={99999999.99}
                  placeholder="0.00"
                  required
                  value={update.amount}
                  onChange={(event) =>
                    setUpdate((current) => ({ ...current, amount: event.target.value }))
                  }
                />
              </div>
            </Field>
            <Field
              label="Tiempo por bloque (min)"
              htmlFor="rate-update-minutes"
              hint={`Equivale a ${minutesLabel(
                Number(update.minimum_minutes ?? currentRate.minimum_minutes),
              )}. Usa múltiplos de 15.`}
            >
              <Input
                id="rate-update-minutes"
                className="font-mono text-base tabular-nums"
                type="number"
                inputMode="numeric"
                min={15}
                max={1440}
                step={15}
                required
                value={update.minimum_minutes ?? String(currentRate.minimum_minutes)}
                onChange={(event) =>
                  setUpdate((current) => ({
                    ...current,
                    minimum_minutes: event.target.value,
                  }))
                }
              />
            </Field>
            <Field
              label="Aplicar desde"
              htmlFor="rate-update-from"
              hint="No puede ser una fecha pasada."
            >
              <Input
                id="rate-update-from"
                type="date"
                min={today}
                required
                value={update.effective_from}
                onChange={(event) =>
                  setUpdate((current) => ({
                    ...current,
                    effective_from: event.target.value,
                  }))
                }
              />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={publish.isPending}>
                {publish.isPending ? "Actualizando…" : "Actualizar tarifa"}
              </Button>
            </div>
          </div>
        </form>
      ) : detail.isSuccess ? (
        <form
          className="mt-6 border-t border-charcoal/10 pt-5"
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
          <TechnicalLabel>CONFIGURAR TARIFA INICIAL</TechnicalLabel>
          <p className="mt-1 text-sm text-charcoal/60">
            Esta instalación todavía no tiene una tarifa activa.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre de la tarifa" htmlFor="rate-name">
              <Input
                id="rate-name"
                required
                minLength={2}
                maxLength={120}
                placeholder="Tarifa general"
                value={form.name}
                onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))}
              />
            </Field>
            <Field label="Precio (USD)" htmlFor="rate-amount">
              <Input
                id="rate-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0.01}
                placeholder="0.00"
                required
                value={form.amount}
                onChange={(event) => setForm((c) => ({ ...c, amount: event.target.value }))}
              />
            </Field>
            <Field label="Duración del bloque" htmlFor="rate-min" hint="En minutos.">
              <Input
                id="rate-min"
                type="number"
                min={15}
                step={15}
                required
                value={form.minimum_minutes}
                onChange={(event) =>
                  setForm((c) => ({ ...c, minimum_minutes: event.target.value }))
                }
              />
            </Field>
            <Field label="Aplicar desde" htmlFor="rate-from">
              <Input
                id="rate-from"
                type="date"
                min={today}
                required
                value={form.valid_from}
                onChange={(event) => setForm((c) => ({ ...c, valid_from: event.target.value }))}
              />
            </Field>
          </div>
          <Button className="mt-5" type="submit" disabled={create.isPending}>
            {create.isPending ? "Guardando…" : "Guardar tarifa inicial"}
          </Button>
        </form>
      ) : null}

      {historicalRates.length > 0 ? (
        <div className="mt-6 border-t border-charcoal/10 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => setHistoryOpen(true)}>
            Ver historial de cambios ({historicalRates.length})
          </Button>
        </div>
      ) : null}

      <Modal
        open={historyOpen}
        title={`Historial de tarifas · ${facility.name}`}
        onClose={() => setHistoryOpen(false)}
      >
        <ul className="divide-y divide-charcoal/10 text-sm">
          {[...(detail.data?.rates ?? [])]
            .sort((left, right) => right.valid_from.localeCompare(left.valid_from))
            .map((rate) => (
              <li key={rate.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div>
                  <span className="font-medium">{rate.name}</span>
                  {rate.id === currentRate?.id ? (
                    <span className="ml-2 border border-olive px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-olive">
                      Vigente
                    </span>
                  ) : null}
                </div>
                <span className="text-right font-mono text-xs">
                  ${Number(rate.amount).toFixed(2)} / {rate.minimum_minutes} min
                  <span className="block text-charcoal/50">
                    {formatRateDate(rate.valid_from)} –{" "}
                    {rate.valid_until ? formatRateDate(rate.valid_until) : "sin fecha de cierre"}
                  </span>
                </span>
              </li>
            ))}
        </ul>
      </Modal>
    </section>
  );
}

function localDateInput(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function minutesLabel(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  if (minutes % 60 === 0) return minutes === 60 ? "1 hora" : `${minutes / 60} horas`;
  return `${minutes} minutos`;
}

function formatRateDate(value: string): string {
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
