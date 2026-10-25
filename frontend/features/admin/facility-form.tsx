"use client";

import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { Field, Input, Select, Textarea } from "@/components/atoms/field";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { KIND_LABEL, SPORT_LABEL, ZONE_LABEL } from "@/lib/format";
import type { Facility, FacilityKind, SportType, Zone } from "@/lib/types";

import { FacilityPhotoField } from "./facility-photo-field";
import { useSaveFacility } from "./hooks";

/** Alta y edicion de una instalacion. `fixedOrganizationId` oculta el selector. */
export function FacilityForm({
  facility,
  organizations,
  fixedOrganizationId,
  onDone,
}: {
  facility?: Facility;
  organizations: { id: string; name: string; is_active: boolean }[];
  fixedOrganizationId?: string;
  onDone: () => void;
}) {
  const save = useSaveFacility();
  const isEdit = Boolean(facility);
  const [photo, setPhoto] = useState<File | null | undefined>(undefined);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const busy = save.isPending || readingPhoto;

  const [form, setForm] = useState({
    organization_id: facility?.organization_id ?? fixedOrganizationId ?? "",
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
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
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
    };
    if (!isEdit) {
      body.organization_id = form.organization_id;
      body.slug = form.slug;
    }

    setPhotoError("");
    if (photo === null) body.photo = null;
    if (photo) {
      setReadingPhoto(true);
      try {
        body.photo = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Could not read photo"));
          reader.onabort = () => reject(new Error("Photo reading aborted"));
          reader.readAsDataURL(photo);
        });
      } catch {
        setPhotoError("No se pudo leer la foto. Selecciona el archivo nuevamente.");
        return;
      } finally {
        setReadingPhoto(false);
      }
    }
    try {
      await save.mutateAsync({ id: facility?.id, body });
      onDone();
    } catch {
      // The mutation reports the API error; preserve the form for retrying.
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-sand/20 p-5">
      <TechnicalLabel>{isEdit ? "EDITAR INSTALACION" : "NUEVA INSTALACION"}</TechnicalLabel>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <FacilityPhotoField facility={facility} photo={photo} onChange={setPhoto} disabled={busy} />
        {photoError ? <p role="alert" className="text-sm text-terracotta sm:col-span-2">{photoError}</p> : null}
        {!isEdit && !fixedOrganizationId ? (
          <Field label="Organización" htmlFor="fa-organization" className="sm:col-span-2">
            <Select
              id="fa-organization"
              required
              value={form.organization_id}
              onChange={(event) => update("organization_id", event.target.value)}
            >
              <option value="">Selecciona una organización</option>
              {organizations
                .filter((organization) => organization.is_active)
                .map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
            </Select>
          </Field>
        ) : null}
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
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear instalacion"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={busy}>
          Cerrar
        </Button>
      </div>
    </form>
  );
}
