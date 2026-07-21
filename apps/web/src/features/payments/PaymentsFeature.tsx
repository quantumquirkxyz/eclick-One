import { useEffect, useMemo, useState } from "react";
import { ClipboardList, CreditCard, Wallet } from "lucide-react";
import { FieldMessage, FormErrorSummary, useFormValidation } from "../../components/forms/useFormValidation";
import { commerceApi, validatePayment } from "../../services/api/commerce";
import { ResourceState } from "../../components/layout/ResourceState";
import { EmptyState } from "../../components/EmptyState";
import { DataTable } from "../../components/tables/DataTable";
import { Skeleton, SkeletonPage, SkeletonPageTitle, SkeletonTable } from "../../components/Skeleton";
import { useI18n } from "../../i18n";
import { normalizeAppError, type AppError } from "../../services/api/client";
import type { NewCommercePayment, CommercePayment, CommerceOrder } from "../../types/commerce";

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: AppError }
  | { status: "success"; payments: readonly CommercePayment[]; orders: readonly CommerceOrder[] };

type PaymentForm = Omit<NewCommercePayment, "referencia"> & { referencia?: string };

const initialForm: PaymentForm = {
  codigo_pedido: "",
  monto_pagado: 0,
  fecha_pago: toLocalInputValue(new Date()),
  tipo_tarjeta: "DB",
};

export function PaymentsFeature() {
  const { t, status, money } = useI18n();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [form, setForm] = useState<PaymentForm>(initialForm);
  const [notice, setNotice] = useState<string | null>(null);
  const formValues = useMemo(() => ({
    codigo_pedido: form.codigo_pedido,
    monto_pagado: String(form.monto_pagado),
    fecha_pago: form.fecha_pago,
    tipo_tarjeta: form.tipo_tarjeta,
  }), [form]);
  const validation = useFormValidation({
    values: formValues,
    validators: {
      codigo_pedido: [(value) => (value.trim().length === 0 ? t("validation.orderRequired") : null)],
      monto_pagado: [
        (value) => (value.trim().length === 0 ? t("validation.amountPositive") : null),
        (value) => (Number(value) > 0 ? null : t("validation.amountPositive")),
      ],
      fecha_pago: [(value) => (value.trim().length === 0 ? t("validation.dateRequired") : null)],
      tipo_tarjeta: [(value) => (value.trim().length === 0 ? t("validation.cardTypeRequired") : null)],
    },
  });

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      const [payments, orders] = await Promise.all([commerceApi.listPayments(), commerceApi.listOrders()]);
      setState({ status: "success", payments, orders });
      const paymentable = orders.find((order) => !order.pagado) ?? orders[0];
      if (paymentable) {
        setForm((current) => ({
          ...current,
          codigo_pedido: paymentable.codigo_pedido,
          monto_pagado: paymentable.monto,
        }));
      }
    } catch (error) {
      setState({ status: "error", error: normalizeAppError(error, t("payments.error")) });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timeout = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timeout);
  }, [notice]);

  const selectedOrder = useMemo(
    () => (state.status === "success" ? state.orders.find((order) => order.codigo_pedido === form.codigo_pedido) : undefined),
    [state, form.codigo_pedido],
  );

  if (state.status === "loading") return <PaymentsLoadingSkeleton title={t("payments.title")} description={t("payments.loading")} />;
  if (state.status === "error") return <ResourceState status="error" title={t("payments.title")} error={state.error} onRetry={load} />;

  const recordPayment = async (): Promise<void> => {
    try {
      if (!selectedOrder) throw new Error(t("common.selectOrder"));
      const request: NewCommercePayment = { ...form, ...(form.referencia ? { referencia: form.referencia } : {}) };
      validatePayment(request, selectedOrder);
      await commerceApi.recordPayment(request);
      setNotice(t("payments.registered"));
      validation.resetValidation();
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t("payments.registerError"));
    }
  };

  const payableOrders = state.orders.filter((order) => order.estado === "generado" || order.estado === "proceso");

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>{t("payments.title")}</h2>
          <p>{t("payments.subtitle")}</p>
        </div>
      </div>
      {notice ? <div className="form-success-note">{notice}</div> : null}
      <div className="grid two">
        <section className="panel">
          <h3>{t("payments.register")}</h3>
          {state.orders.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={t("payments.registerEmptyTitle")}
              description={t("payments.registerEmptyDescription")}
              compact
            />
          ) : (
            <>
              <FormErrorSummary title={t("validation.summaryTitle")} errors={Object.values(validation.errors).filter((error): error is string => Boolean(error))} />
              <form onSubmit={(event) => validation.onSubmit(event, recordPayment)} noValidate>
                <div className="form-grid">
                  <Select
                    name="codigo_pedido"
                    label={t("common.order")}
                    value={form.codigo_pedido}
                    options={state.orders.map((order) => ({ value: order.codigo_pedido, label: `${order.codigo_pedido} · ${status(order.estado)}` }))}
                    onChange={(value) => {
                      const order = state.orders.find((item) => item.codigo_pedido === value);
                      setForm({
                        ...form,
                        codigo_pedido: value,
                        monto_pagado: order?.monto ?? form.monto_pagado,
                      });
                    }}
                    onBlur={() => validation.markBlurred("codigo_pedido")}
                    error={validation.getError("codigo_pedido")}
                    success={validation.shouldShowSuccess("codigo_pedido")}
                  />
                  <Field name="monto_pagado" label={t("common.amount")} value={String(form.monto_pagado)} onChange={(value) => setForm({ ...form, monto_pagado: Number(value) })} onBlur={() => validation.markBlurred("monto_pagado")} error={validation.getError("monto_pagado")} success={validation.shouldShowSuccess("monto_pagado")} type="number" inputMode="decimal" />
                  <Field name="fecha_pago" label={t("payments.paymentDate")} value={form.fecha_pago} onChange={(value) => setForm({ ...form, fecha_pago: value })} onBlur={() => validation.markBlurred("fecha_pago")} error={validation.getError("fecha_pago")} success={validation.shouldShowSuccess("fecha_pago")} type="datetime-local" />
                  <Select
                    name="tipo_tarjeta"
                    label={t("payments.cardType")}
                    value={form.tipo_tarjeta}
                    options={[{ value: "DB", label: "DB" }, { value: "CR", label: "CR" }]}
                    onChange={(value) => setForm({ ...form, tipo_tarjeta: value as NewCommercePayment["tipo_tarjeta"] })}
                    onBlur={() => validation.markBlurred("tipo_tarjeta")}
                    error={validation.getError("tipo_tarjeta")}
                    success={validation.shouldShowSuccess("tipo_tarjeta")}
                  />
                  <Field
                    name="referencia"
                    label={t("common.reference")}
                    value={form.referencia ?? ""}
                    onChange={(value) =>
                      setForm(
                        value.trim().length
                          ? { ...form, referencia: value }
                          : (() => {
                              const next = { ...form };
                              delete next.referencia;
                              return next;
                            })(),
                      )
                    }
                  />
                </div>
                <button className="primary-button" type="submit" disabled={!selectedOrder || !validation.isValid}>{t("payments.register")}</button>
              </form>
            </>
          )}
        </section>
        <section className="panel">
          <h3>{t("payments.currentOrders")}</h3>
          {payableOrders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={t("payments.currentEmptyTitle")}
              description={t("payments.currentEmptyDescription")}
              compact
            />
          ) : (
            <DataTable
              columns={[t("common.order"), t("common.status"), t("common.amount")]}
              rows={payableOrders.map((order) => [order.codigo_pedido, status(order.estado), money(order.monto)])}
            />
          )}
        </section>
      </div>
      <section className="panel">
        <h3>{t("payments.history")}</h3>
        {state.payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={t("payments.historyEmptyTitle")}
            description={t("payments.historyEmptyDescription")}
            compact
          />
        ) : (
          <DataTable
            columns={["ID", t("common.order"), t("common.amount"), t("customers.card"), t("common.date"), t("common.reference")]}
            rows={state.payments.map((payment) => [
              String(payment.id_pago),
              payment.codigo_pedido,
              money(payment.monto_pagado),
              payment.tipo_tarjeta,
              payment.fecha_pago,
              payment.referencia ?? t("payments.noReference"),
            ])}
          />
        )}
      </section>
    </section>
  );
}

function PaymentsLoadingSkeleton({ title, description }: { title: string; description: string }) {
  return (
    <SkeletonPage title={title} description={description}>
      <SkeletonPageTitle />
      <div className="grid two">
        <section className="panel" aria-hidden="true">
          <Skeleton className="skeleton-heading" />
          <div className="form-grid skeleton-form-grid">
            {Array.from({ length: 5 }, (_, index) => (
              <div className="field" key={index}>
                <Skeleton className="skeleton-field-label" />
                <Skeleton className="skeleton-input" />
              </div>
            ))}
          </div>
          <Skeleton className="skeleton-button" />
        </section>
        <section className="panel" aria-hidden="true">
          <Skeleton className="skeleton-heading" />
          <SkeletonTable columns={3} rows={4} className="skeleton-table-compact" />
        </section>
      </div>
      <section className="panel" aria-hidden="true">
        <Skeleton className="skeleton-heading" />
        <SkeletonTable columns={6} rows={6} />
      </section>
    </SkeletonPage>
  );
}

function Field({
  name,
  label,
  value,
  onChange,
  onBlur,
  error,
  success = false,
  type = "text",
  inputMode,
}: {
  name: string;
  label: string;
  value: string;
  onChange(value: string): void;
  onBlur?(): void;
  error?: string | null | undefined;
  success?: boolean;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} type={type} value={value} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} className={success ? "field-valid" : undefined} inputMode={inputMode} />
      <FieldMessage id={`${name}-error`} error={error} />
    </label>
  );
}

function Select({
  name,
  label,
  value,
  options,
  onChange,
  onBlur,
  error,
  success = false,
}: {
  name: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange(value: string): void;
  onBlur?(): void;
  error?: string | null | undefined;
  success?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select name={name} value={value} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} className={success ? "field-valid" : undefined}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldMessage id={`${name}-error`} error={error} />
    </label>
  );
}

function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
