"use client";

import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { Field, Input } from "@/components/atoms/field";
import { Modal } from "@/components/atoms/modal";
import { LoadingBlock } from "@/components/atoms/states";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import type { Facility } from "@/lib/types";

import { useAdminFacility, useCreateRate, usePublishRate } from "./hooks";
import { formatRateDate, localDateInput, minutesLabel } from "./schedule-utils";

/** Tarifa vigente de una instalacion: alta inicial, actualizacion e historial. */
export function RateForm({ facility }: { facility: Facility }) {
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
