"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/atoms/button";
import { Field, Input } from "@/components/atoms/field";
import { facilityImage } from "@/lib/format";
import type { Facility } from "@/lib/types";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function FacilityPhotoField({
  facility,
  photo,
  onChange,
  disabled,
}: {
  facility?: Facility;
  photo: File | null | undefined;
  onChange: (photo: File | null | undefined) => void;
  disabled: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const currentPhoto = facility?.images[0];
  const imageUrl = photo
    ? preview
    : photo === undefined && currentPhoto && facility
      ? facilityImage(facility.facility_kind, facility.images)
      : null;

  return (
    <div className="space-y-3 rounded-2xl border border-charcoal/15 bg-ivory/70 p-4 sm:col-span-2">
      <Field
        label="Foto de la instalación"
        htmlFor="fa-photo"
        hint="Opcional. JPG, PNG o WebP, hasta 5 MB y 20 megapíxeles. Se mostrará en el catálogo y la ficha."
        error={error}
      >
        <Input
          id="fa-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
              setError(
                file.size > MAX_PHOTO_BYTES
                  ? "La foto no debe superar los 5 MB."
                  : "Selecciona una imagen JPG, PNG o WebP.",
              );
              event.target.value = "";
              return;
            }
            setError("");
            onChange(file);
            event.target.value = "";
          }}
        />
      </Field>
      {imageUrl ? (
        <div className="overflow-hidden rounded-xl border border-charcoal/10 bg-sand/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`Vista previa de ${facility?.name ?? "la instalación"}`}
            className="aspect-[8/5] max-h-64 w-full object-cover"
          />
        </div>
      ) : (
        <p className="text-sm text-charcoal/60">Sin foto. Se utilizará la ilustración del tipo de instalación.</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {imageUrl ? (
          <Button type="button" variant="ghost" disabled={disabled} onClick={() => {
            setError("");
            onChange(null);
          }}>
            Quitar foto
          </Button>
        ) : null}
        {photo !== undefined && currentPhoto ? (
          <Button type="button" variant="ghost" disabled={disabled} onClick={() => {
            setError("");
            onChange(undefined);
          }}>
            Conservar foto actual
          </Button>
        ) : null}
        {photo !== undefined ? <p className="text-xs text-charcoal/60">El cambio se aplicará al guardar.</p> : null}
      </div>
    </div>
  );
}
