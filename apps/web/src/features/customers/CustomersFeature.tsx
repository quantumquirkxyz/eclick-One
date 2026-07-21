import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { FieldMessage, FormErrorSummary, useFormValidation } from "../../components/forms/useFormValidation";
import { commerceApi, validateClient } from "../../services/api/commerce";
import { ResourceState } from "../../components/layout/ResourceState";
import { EmptyState } from "../../components/EmptyState";
import { DataTable } from "../../components/tables/DataTable";
import { Skeleton, SkeletonPage, SkeletonPageTitle, SkeletonTable } from "../../components/Skeleton";
import { useI18n } from "../../i18n";
import { normalizeAppError, type AppError } from "../../services/api/client";
import type { CommerceClient, NewCommerceClient, CommerceProvince } from "../../types/commerce";

type LoadState =
  | { status: "loading" }
  | { status: "error"; error: AppError }
  | { status: "success"; clients: readonly CommerceClient[]; provinces: readonly CommerceProvince[] };

const emptyForm: NewCommerceClient = {
  nombre: "",
  apellido: "",
  identificacion: "",
  provincia: { id: "", codigo: "", nombre: "", prefijo: "" },
  tipo_tarjeta: "DB",
  paz_y_salvo: true,
};

export function CustomersFeature() {
  const { t, provinceName } = useI18n();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [form, setForm] = useState<NewCommerceClient>(emptyForm);
  const [notice, setNotice] = useState<string | null>(null);
  const [preferenceCode, setPreferenceCode] = useState("");
  const [preference, setPreference] = useState<string | null>(null);
  const formValues = useMemo(() => ({
    nombre: form.nombre,
    apellido: form.apellido,
    identificacion: form.identificacion,
    provincia: form.provincia.codigo,
    tipo_tarjeta: form.tipo_tarjeta,
  }), [form]);
  const validation = useFormValidation({
    values: formValues,
    validators: {
      nombre: [
        (value) => (value.trim().length === 0 ? t("auth.firstNameRequired") : null),
        (value) => (value.trim().length >= 2 ? null : t("validation.firstNameMin")),
      ],
      apellido: [
        (value) => (value.trim().length === 0 ? t("auth.lastNameRequired") : null),
        (value) => (value.trim().length >= 2 ? null : t("validation.lastNameMin")),
      ],
      identificacion: [
        (value) => (value.trim().length === 0 ? t("validation.identificationRequired") : null),
      ],
      provincia: [
        (value) => (value.trim().length === 0 ? t("validation.provinceRequired") : null),
      ],
      tipo_tarjeta: [
        (value) => (value.trim().length === 0 ? t("validation.cardTypeRequired") : null),
      ],
    },
  });

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      const [clients, provinces] = await Promise.all([commerceApi.listClients(), commerceApi.listProvinces()]);
      setState({ status: "success", clients, provinces });
      if (!form.provincia.codigo && provinces[0]) {
        setForm((current) => ({ ...current, provincia: provinces[0]! }));
      }
    } catch (error) {
      setState({ status: "error", error: normalizeAppError(error, t("customers.error")) });
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

  if (state.status === "loading") {
    return <CustomersLoadingSkeleton title={t("customers.title")} description={t("customers.loading")} />;
  }
  if (state.status === "error") {
    return <ResourceState status="error" title={t("customers.title")} error={state.error} onRetry={load} />;
  }

  const createClient = async (): Promise<void> => {
    try {
      validateClient(form);
      await commerceApi.createClient(form);
      setNotice(t("customers.created"));
      if (state.provinces[0]) {
        setForm({ ...emptyForm, provincia: state.provinces[0] });
      } else {
        setForm(emptyForm);
      }
      validation.resetValidation();
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : t("customers.createError"));
    }
  };

  const searchPreference = async (): Promise<void> => {
    try {
      const code = Number(preferenceCode);
      if (!Number.isInteger(code)) {
        throw new Error(t("common.invalidCode"));
      }
      const result = await commerceApi.getClientPreference(code);
      setPreference(result ? `${t("common.product")} ${result.codigo_producto}` : t("dashboard.noPreference"));
    } catch (error) {
      setPreference(error instanceof Error ? error.message : t("customers.lookupError"));
    }
  };

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>{t("customers.title")}</h2>
          <p>{t("customers.subtitle")}</p>
        </div>
      </div>
      {notice ? <div className="form-success-note">{notice}</div> : null}
      <div className="grid two">
        <section className="panel">
          <h3>{t("customers.new")}</h3>
          <FormErrorSummary title={t("validation.summaryTitle")} errors={Object.values(validation.errors).filter((error): error is string => Boolean(error))} />
          <form onSubmit={(event) => validation.onSubmit(event, createClient)} noValidate>
            <div className="form-grid">
              <Field name="nombre" label={t("customers.firstName")} value={form.nombre} onChange={(value) => setForm({ ...form, nombre: value })} onBlur={() => validation.markBlurred("nombre")} error={validation.getError("nombre")} success={validation.shouldShowSuccess("nombre")} />
              <Field name="apellido" label={t("customers.lastName")} value={form.apellido} onChange={(value) => setForm({ ...form, apellido: value })} onBlur={() => validation.markBlurred("apellido")} error={validation.getError("apellido")} success={validation.shouldShowSuccess("apellido")} />
              <Field name="identificacion" label={t("customers.identification")} value={form.identificacion} onChange={(value) => setForm({ ...form, identificacion: value })} onBlur={() => validation.markBlurred("identificacion")} error={validation.getError("identificacion")} success={validation.shouldShowSuccess("identificacion")} inputMode="numeric" />
              <Field name="numero_tarjeta" label={t("customers.cardNumber")} value={form.numero_tarjeta ?? ""} onChange={(value) => setForm({ ...form, numero_tarjeta: value })} inputMode="numeric" />
              <Select
                name="provincia"
                label={t("customers.province")}
                value={form.provincia.codigo}
                options={state.provinces.map((province) => ({ value: province.codigo, label: provinceName(province.codigo, province.nombre) }))}
                onChange={(value) => {
                  const province = state.provinces.find((item) => item.codigo === value);
                  if (province) setForm({ ...form, provincia: province });
                }}
                onBlur={() => validation.markBlurred("provincia")}
                error={validation.getError("provincia")}
                success={validation.shouldShowSuccess("provincia")}
              />
              <Select
                name="tipo_tarjeta"
                label={t("customers.card")}
                value={form.tipo_tarjeta}
                options={[{ value: "DB", label: "DB" }, { value: "CR", label: "CR" }]}
                onChange={(value) => setForm({ ...form, tipo_tarjeta: value as NewCommerceClient["tipo_tarjeta"] })}
                onBlur={() => validation.markBlurred("tipo_tarjeta")}
                error={validation.getError("tipo_tarjeta")}
                success={validation.shouldShowSuccess("tipo_tarjeta")}
              />
              <label className="switch-row">
                <input type="checkbox" checked={form.paz_y_salvo} onChange={(event) => setForm({ ...form, paz_y_salvo: event.target.checked })} />
                <span>{t("customers.goodStanding")}</span>
              </label>
            </div>
            <button className="primary-button" type="submit" disabled={!validation.isValid}>{t("customers.create")}</button>
          </form>
        </section>
        <section className="panel">
          <h3>{t("customers.preference")}</h3>
          <div className="inline-form">
            <Field name="preferenceCode" label={t("customers.customerCode")} value={preferenceCode} onChange={setPreferenceCode} inputMode="numeric" />
            <button className="secondary-button" onClick={() => void searchPreference()}>{t("customers.lookup")}</button>
          </div>
          {preference ? (
            <p className="inline-status">{preference}</p>
          ) : (
            <EmptyState
              icon={Search}
              title={t("customers.preferenceEmptyTitle")}
              description={t("customers.preferenceEmptyDescription")}
              compact
            />
          )}
        </section>
      </div>
      <section className="panel">
        <h3>{t("customers.list")}</h3>
        {state.clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("customers.listEmptyTitle")}
            description={t("customers.listEmptyDescription")}
          />
        ) : (
          <DataTable
            columns={[t("customers.code"), t("common.customer"), t("customers.province"), t("customers.card"), t("customers.goodStanding")]}
            rows={state.clients.map((client) => [
              String(client.codigo_cliente),
              `${client.nombre} ${client.apellido}`,
              provinceName(client.provincia.codigo, client.provincia.nombre),
              client.tipo_tarjeta,
              client.paz_y_salvo ? t("common.yes") : t("common.no"),
            ])}
          />
        )}
      </section>
    </section>
  );
}

function CustomersLoadingSkeleton({ title, description }: { title: string; description: string }) {
  return (
    <SkeletonPage title={title} description={description}>
      <SkeletonPageTitle />
      <div className="grid two">
        <section className="panel" aria-hidden="true">
          <Skeleton className="skeleton-heading" />
          <div className="form-grid skeleton-form-grid">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="field" key={index}>
                <Skeleton className="skeleton-field-label" />
                <Skeleton className="skeleton-input" />
              </div>
            ))}
            <div className="switch-row skeleton-switch-row">
              <Skeleton className="skeleton-checkbox" />
              <Skeleton className="skeleton-switch-label" />
            </div>
          </div>
          <Skeleton className="skeleton-button" />
        </section>
        <section className="panel" aria-hidden="true">
          <Skeleton className="skeleton-heading" />
          <div className="inline-form">
            <div className="field">
              <Skeleton className="skeleton-field-label" />
              <Skeleton className="skeleton-input" />
            </div>
            <Skeleton className="skeleton-button skeleton-button-secondary" />
          </div>
          <Skeleton className="skeleton-inline-status" />
        </section>
      </div>
      <section className="panel" aria-hidden="true">
        <Skeleton className="skeleton-heading" />
        <SkeletonTable columns={5} rows={6} />
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
