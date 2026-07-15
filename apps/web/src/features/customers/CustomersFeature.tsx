import { useEffect, useState } from "react";
import { commerceApi, validateClient } from "../../services/api/commerce";
import { ResourceState } from "../../components/layout/ResourceState";
import { DataTable } from "../../components/tables/DataTable";
import { useI18n } from "../../i18n";
import type { CommerceClient, NewCommerceClient, CommerceProvince } from "../../types/commerce";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
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
  const [preference, setPreference] = useState<string>(t("customers.noLookup"));

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      const [clients, provinces] = await Promise.all([commerceApi.listClients(), commerceApi.listProvinces()]);
      setState({ status: "success", clients, provinces });
      if (!form.provincia.codigo && provinces[0]) {
        setForm((current) => ({ ...current, provincia: provinces[0]! }));
      }
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : t("customers.error") });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (state.status === "loading") {
    return <ResourceState status="loading" title={t("customers.title")} description={t("customers.loading")} />;
  }
  if (state.status === "error") {
    return <ResourceState status="error" title={t("customers.title")} error={state.message} onRetry={load} />;
  }
  if (state.clients.length === 0) {
    return <ResourceState status="empty" title={t("customers.title")} description={t("customers.empty")} onRetry={load} />;
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
      {notice ? <div className="demo-note">{notice}</div> : null}
      <div className="grid two">
        <section className="panel">
          <h3>{t("customers.new")}</h3>
          <div className="form-grid">
            <Field label={t("customers.firstName")} value={form.nombre} onChange={(value) => setForm({ ...form, nombre: value })} />
            <Field label={t("customers.lastName")} value={form.apellido} onChange={(value) => setForm({ ...form, apellido: value })} />
            <Field label={t("customers.identification")} value={form.identificacion} onChange={(value) => setForm({ ...form, identificacion: value })} />
            <Select
              label={t("customers.province")}
              value={form.provincia.codigo}
              options={state.provinces.map((province) => ({ value: province.codigo, label: provinceName(province.codigo, province.nombre) }))}
              onChange={(value) => {
                const province = state.provinces.find((item) => item.codigo === value);
                if (province) setForm({ ...form, provincia: province });
              }}
            />
            <Select
              label={t("customers.card")}
              value={form.tipo_tarjeta}
              options={[{ value: "DB", label: "DB" }, { value: "CR", label: "CR" }]}
              onChange={(value) => setForm({ ...form, tipo_tarjeta: value as NewCommerceClient["tipo_tarjeta"] })}
            />
            <label className="switch-row">
              <input type="checkbox" checked={form.paz_y_salvo} onChange={(event) => setForm({ ...form, paz_y_salvo: event.target.checked })} />
              <span>{t("customers.goodStanding")}</span>
            </label>
          </div>
          <button className="primary-button" onClick={() => void createClient()}>{t("customers.create")}</button>
        </section>
        <section className="panel">
          <h3>{t("customers.preference")}</h3>
          <div className="inline-form">
            <Field label={t("customers.customerCode")} value={preferenceCode} onChange={setPreferenceCode} />
            <button className="secondary-button" onClick={() => void searchPreference()}>{t("customers.lookup")}</button>
          </div>
          <p className="inline-status">{preference}</p>
        </section>
      </div>
      <section className="panel">
        <h3>{t("customers.list")}</h3>
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
      </section>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange(value: string): void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
