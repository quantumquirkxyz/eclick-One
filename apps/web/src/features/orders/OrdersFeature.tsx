import { useEffect, useMemo, useState } from "react";
import { ClipboardList, History, RefreshCcw } from "lucide-react";
import { FieldMessage, FormErrorSummary, useFormValidation } from "../../components/forms/useFormValidation";
import { commerceApi, validateOrder, validateTransition } from "../../services/api/commerce";
import { ResourceState } from "../../components/layout/ResourceState";
import { EmptyState } from "../../components/EmptyState";
import { DataTable } from "../../components/tables/DataTable";
import { OnChainStatusBadge } from "../../components/agent/OnChainStatusBadge";
import { Skeleton, SkeletonPage, SkeletonPageTitle, SkeletonTable } from "../../components/Skeleton";
import { useI18n } from "../../i18n";
import { normalizeAppError, type AppError } from "../../services/api/client";
import type { CommerceClient, CommerceOrderStatus, NewCommerceOrder, CommerceOrder, CommerceProduct } from "../../types/commerce";

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: AppError }
  | {
      status: "success";
      clients: readonly CommerceClient[];
      products: readonly CommerceProduct[];
      orders: readonly CommerceOrder[];
      currentOrders: readonly CommerceOrder[];
    };

const initialForm: NewCommerceOrder = {
  codigo_cliente: 1,
  codigo_producto: 1000,
  cantidad: 1,
  direccion: "",
  fecha_pedido: toLocalInputValue(new Date()),
  etiqueta: "order-web",
  tipo_duracion: "48h",
};

export function OrdersFeature() {
  const { t, status, productName } = useI18n();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [form, setForm] = useState<NewCommerceOrder>(initialForm);
  const [statusForm, setStatusForm] = useState<{ codigo_pedido: string; estado: CommerceOrderStatus }>({
    codigo_pedido: "",
    estado: "proceso",
  });
  const [notice, setNotice] = useState<string | null>(null);
  const formValues = useMemo(() => ({
    codigo_cliente: String(form.codigo_cliente),
    codigo_producto: String(form.codigo_producto),
    cantidad: String(form.cantidad),
    direccion: form.direccion,
    fecha_pedido: form.fecha_pedido,
    etiqueta: form.etiqueta,
    tipo_duracion: form.tipo_duracion,
  }), [form]);
  const validation = useFormValidation({
    values: formValues,
    validators: {
      codigo_cliente: [(value) => (value.trim().length === 0 ? t("validation.customerRequired") : null)],
      codigo_producto: [(value) => (value.trim().length === 0 ? t("validation.productRequired") : null)],
      cantidad: [
        (value) => (value.trim().length === 0 ? t("validation.quantityPositive") : null),
        (value) => (Number(value) >= 1 ? null : t("validation.quantityPositive")),
      ],
      direccion: [(value) => (value.trim().length === 0 ? t("validation.addressRequired") : null)],
      fecha_pedido: [(value) => (value.trim().length === 0 ? t("validation.dateRequired") : null)],
      etiqueta: [(value) => (value.trim().length === 0 ? t("validation.required") : null)],
      tipo_duracion: [(value) => (value.trim().length === 0 ? t("validation.required") : null)],
    },
  });

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      const [clients, products, orders, currentOrders] = await Promise.all([
        commerceApi.listClients(),
        commerceApi.listProducts(),
        commerceApi.listOrders(),
        commerceApi.listCurrentOrders(),
      ]);
      setState({ status: "success", clients, products, orders, currentOrders });
      setForm((current) => ({
        ...current,
        codigo_cliente: clients[0]?.codigo_cliente ?? 1,
        codigo_producto: products[0]?.codigo_producto ?? 1000,
      }));
      setStatusForm((current) => ({ ...current, codigo_pedido: currentOrders[0]?.codigo_pedido ?? orders[0]?.codigo_pedido ?? "" }));
    } catch (error) {
      setState({ status: "error", error: normalizeAppError(error, t("orders.error")) });
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

  const selectedClient = useMemo(
    () => (state.status === "success" ? state.clients.find((item) => item.codigo_cliente === form.codigo_cliente) : undefined),
    [state, form.codigo_cliente],
  );
  const selectedOrder = useMemo(
    () => (state.status === "success" ? state.orders.find((item) => item.codigo_pedido === statusForm.codigo_pedido) : undefined),
    [state, statusForm.codigo_pedido],
  );

  if (state.status === "loading") return <OrdersLoadingSkeleton title={t("orders.title")} description={t("orders.loading")} />;
  if (state.status === "error") return <ResourceState status="error" title={t("orders.title")} error={state.error} onRetry={load} />;

  const createOrder = async (): Promise<void> => {
    try {
      if (!selectedClient) throw new Error(t("common.selectCustomer"));
      validateOrder(form, selectedClient);
      await commerceApi.createOrder(form);
      setNotice(t("orders.created"));
      setForm((current) => ({ ...current, direccion: "" }));
      validation.resetValidation();
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t("orders.createError"));
    }
  };

  const changeStatus = async (): Promise<void> => {
    try {
      if (!selectedOrder) throw new Error(t("common.selectOrder"));
      validateTransition(selectedOrder, statusForm.estado);
      await commerceApi.transitionOrderStatus(statusForm.codigo_pedido, statusForm.estado);
      setNotice(t("orders.updated"));
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t("orders.updateError"));
    }
  };

  const hasCurrentOrders = state.currentOrders.length > 0;
  const hasOrderHistory = state.orders.length > 0;

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>{t("orders.title")}</h2>
          <p>{t("orders.subtitle")}</p>
        </div>
      </div>
      {notice ? <div className="form-success-note">{notice}</div> : null}
      <div className="grid two">
        <section className="panel">
          <h3>{t("orders.create")}</h3>
          <FormErrorSummary title={t("validation.summaryTitle")} errors={Object.values(validation.errors).filter((error): error is string => Boolean(error))} />
          <form onSubmit={(event) => validation.onSubmit(event, createOrder)} noValidate>
            <div className="form-grid">
              <Select name="codigo_cliente" label={t("orders.customer")} value={String(form.codigo_cliente)} options={state.clients.map((client) => ({ value: String(client.codigo_cliente), label: `${client.nombre} ${client.apellido}` }))} onChange={(value) => setForm({ ...form, codigo_cliente: Number(value) })} onBlur={() => validation.markBlurred("codigo_cliente")} error={validation.getError("codigo_cliente")} success={validation.shouldShowSuccess("codigo_cliente")} />
              <Select name="codigo_producto" label={t("orders.product")} value={String(form.codigo_producto)} options={state.products.map((product) => ({ value: String(product.codigo_producto), label: productName(product.codigo_producto, product.nombre) }))} onChange={(value) => setForm({ ...form, codigo_producto: Number(value) })} onBlur={() => validation.markBlurred("codigo_producto")} error={validation.getError("codigo_producto")} success={validation.shouldShowSuccess("codigo_producto")} />
              <Field name="cantidad" label={t("orders.quantity")} value={String(form.cantidad)} onChange={(value) => setForm({ ...form, cantidad: Number(value) })} onBlur={() => validation.markBlurred("cantidad")} error={validation.getError("cantidad")} success={validation.shouldShowSuccess("cantidad")} type="number" inputMode="numeric" />
              <Field name="direccion" label={t("orders.address")} value={form.direccion} onChange={(value) => setForm({ ...form, direccion: value })} onBlur={() => validation.markBlurred("direccion")} error={validation.getError("direccion")} success={validation.shouldShowSuccess("direccion")} />
              <Field name="fecha_pedido" label={t("orders.orderDate")} value={form.fecha_pedido} onChange={(value) => setForm({ ...form, fecha_pedido: value })} onBlur={() => validation.markBlurred("fecha_pedido")} error={validation.getError("fecha_pedido")} success={validation.shouldShowSuccess("fecha_pedido")} type="datetime-local" />
              <Field name="etiqueta" label={t("orders.label")} value={form.etiqueta} onChange={(value) => setForm({ ...form, etiqueta: value })} onBlur={() => validation.markBlurred("etiqueta")} error={validation.getError("etiqueta")} success={validation.shouldShowSuccess("etiqueta")} />
              <Field name="tipo_duracion" label={t("orders.durationType")} value={form.tipo_duracion} onChange={(value) => setForm({ ...form, tipo_duracion: value })} onBlur={() => validation.markBlurred("tipo_duracion")} error={validation.getError("tipo_duracion")} success={validation.shouldShowSuccess("tipo_duracion")} />
            </div>
            <button className="primary-button" type="submit" disabled={!validation.isValid}>{t("orders.create")}</button>
          </form>
        </section>
        <section className="panel">
          <h3>{t("orders.changeStatus")}</h3>
          {hasCurrentOrders ? (
            <>
              <div className="form-grid">
                <Select
                  name="status_order"
                  label={t("common.order")}
                  value={statusForm.codigo_pedido}
                  options={state.currentOrders.map((order) => ({ value: order.codigo_pedido, label: order.codigo_pedido }))}
                  onChange={(value) => setStatusForm({ ...statusForm, codigo_pedido: value })}
                />
                <Select
                  name="status"
                  label={t("common.status")}
                  value={statusForm.estado}
                  options={[{ value: "generado", label: status("generado") }, { value: "proceso", label: status("proceso") }, { value: "entregado", label: status("entregado") }, { value: "cancelado", label: status("cancelado") }, { value: "facturado", label: status("facturado") }]}
                  onChange={(value) => setStatusForm({ ...statusForm, estado: value as CommerceOrderStatus })}
                />
              </div>
              <button className="secondary-button" onClick={() => void changeStatus()}>{t("orders.updateStatus")}</button>
            </>
          ) : (
            <EmptyState
              icon={RefreshCcw}
              title={t("orders.statusEmptyTitle")}
              description={t("orders.statusEmptyDescription")}
              compact
            />
          )}
        </section>
      </div>
      <section className="panel">
        <h3>{t("orders.current")}</h3>
        {hasCurrentOrders ? (
          <DataTable
            columns={[t("common.order"), t("common.customer"), t("common.product"), t("common.date"), t("common.status"), t("dashboard.onChain")]}
            rows={state.currentOrders.map((order) => [
              order.codigo_pedido,
              customerLabel(state.clients, order.codigo_cliente),
              productLabel(state.products, order.codigo_producto, productName),
              order.fecha_pedido,
              status(order.estado),
              <OnChainStatusBadge key={order.codigo_pedido} orderCode={order.codigo_pedido} />,
            ])}
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title={t("orders.currentEmptyTitle")}
            description={t("orders.currentEmptyDescription")}
            compact
          />
        )}
      </section>
      <section className="panel">
        <h3>{t("orders.history")}</h3>
        {hasOrderHistory ? (
          <DataTable
            columns={[t("common.order"), t("common.customer"), t("common.product"), t("common.amount"), t("common.status"), t("dashboard.onChain")]}
            rows={state.orders.map((order) => [
              order.codigo_pedido,
              customerLabel(state.clients, order.codigo_cliente),
              productLabel(state.products, order.codigo_producto, productName),
              String(order.monto),
              status(order.estado),
              <OnChainStatusBadge key={order.codigo_pedido} orderCode={order.codigo_pedido} />,
            ])}
          />
        ) : (
          <EmptyState
            icon={History}
            title={t("orders.historyEmptyTitle")}
            description={t("orders.historyEmptyDescription")}
            compact
          />
        )}
      </section>
    </section>
  );
}

function OrdersLoadingSkeleton({ title, description }: { title: string; description: string }) {
  return (
    <SkeletonPage title={title} description={description}>
      <SkeletonPageTitle />
      <div className="grid two">
        <section className="panel" aria-hidden="true">
          <Skeleton className="skeleton-heading" />
          <div className="form-grid skeleton-form-grid">
            {Array.from({ length: 7 }, (_, index) => (
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
          <div className="form-grid skeleton-form-grid">
            {Array.from({ length: 2 }, (_, index) => (
              <div className="field" key={index}>
                <Skeleton className="skeleton-field-label" />
                <Skeleton className="skeleton-input" />
              </div>
            ))}
          </div>
          <Skeleton className="skeleton-button skeleton-button-secondary" />
        </section>
      </div>
      <section className="panel" aria-hidden="true">
        <Skeleton className="skeleton-heading" />
        <SkeletonTable columns={6} rows={5} />
      </section>
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

function customerLabel(clients: readonly CommerceClient[], codigo: number): string {
  const client = clients.find((item) => item.codigo_cliente === codigo);
  return client ? `${client.nombre} ${client.apellido}` : `Customer ${codigo}`;
}

function productLabel(products: readonly CommerceProduct[], codigo: number, translateProduct: (code: number, fallback: string) => string): string {
  const product = products.find((item) => item.codigo_producto === codigo);
  return product ? translateProduct(product.codigo_producto, product.nombre) : `Product ${codigo}`;
}

function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
