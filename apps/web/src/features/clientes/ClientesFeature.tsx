import { useEffect, useState } from "react";
import { commerceApi, validarCliente } from "../../services/api/commerce";
import { ResourceState } from "../../components/layout/ResourceState";
import { DataTable } from "../../components/tables/DataTable";
import type { Cliente, NewCliente, Provincia } from "../../types/commerce";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; clientes: readonly Cliente[]; provincias: readonly Provincia[] };

const emptyForm: NewCliente = {
  nombre: "",
  apellido: "",
  identificacion: "",
  provincia: { id: "", codigo: "", nombre: "", prefijo: "" },
  tipo_tarjeta: "DB",
  paz_y_salvo: true,
};

export function ClientesFeature() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [form, setForm] = useState<NewCliente>(emptyForm);
  const [notice, setNotice] = useState<string | null>(null);
  const [preferenceCode, setPreferenceCode] = useState("");
  const [preference, setPreference] = useState<string>("Sin consulta");

  const load = async (): Promise<void> => {
    setState({ status: "loading" });
    try {
      const [clientes, provincias] = await Promise.all([commerceApi.listClients(), commerceApi.listProvinces()]);
      setState({ status: "success", clientes, provincias });
      if (!form.provincia.codigo && provincias[0]) {
        setForm((current) => ({ ...current, provincia: provincias[0]! }));
      }
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "No se pudo cargar clientes." });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (state.status === "loading") {
    return <ResourceState status="loading" title="Clientes" description="Cargando cartera..." />;
  }
  if (state.status === "error") {
    return <ResourceState status="error" title="Clientes" error={state.message} onRetry={load} />;
  }
  if (state.clientes.length === 0) {
    return <ResourceState status="empty" title="Clientes" description="No hay clientes registrados." onRetry={load} />;
  }

  const createClient = async (): Promise<void> => {
    try {
      validarCliente(form);
      await commerceApi.createClient(form);
      setNotice("Cliente creado en modo mock.");
      if (state.provincias[0]) {
        setForm({ ...emptyForm, provincia: state.provincias[0] });
      } else {
        setForm(emptyForm);
      }
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo crear el cliente.");
    }
  };

  const searchPreference = async (): Promise<void> => {
    try {
      const code = Number(preferenceCode);
      if (!Number.isInteger(code)) {
        throw new Error("Código inválido");
      }
      const result = await commerceApi.getClientPreference(code);
      setPreference(result ? `Producto ${result.codigo_producto}` : "Sin preferencia");
    } catch (error) {
      setPreference(error instanceof Error ? error.message : "No se pudo consultar la preferencia.");
    }
  };

  return (
    <section>
      <div className="page-title">
        <div>
          <h2>Clientes</h2>
          <p>Alta de clientes, consulta de preferencia y elegibilidad paz y salvo.</p>
        </div>
      </div>
      {notice ? <div className="demo-note">{notice}</div> : null}
      <div className="grid two">
        <section className="panel">
          <h3>Nuevo cliente</h3>
          <div className="form-grid">
            <Field label="Nombre" value={form.nombre} onChange={(value) => setForm({ ...form, nombre: value })} />
            <Field label="Apellido" value={form.apellido} onChange={(value) => setForm({ ...form, apellido: value })} />
            <Field label="Identificación" value={form.identificacion} onChange={(value) => setForm({ ...form, identificacion: value })} />
            <Select
              label="Provincia"
              value={form.provincia.codigo}
              options={state.provincias.map((provincia) => ({ value: provincia.codigo, label: provincia.nombre }))}
              onChange={(value) => {
                const provincia = state.provincias.find((item) => item.codigo === value);
                if (provincia) setForm({ ...form, provincia });
              }}
            />
            <Select
              label="Tarjeta"
              value={form.tipo_tarjeta}
              options={[{ value: "DB", label: "DB" }, { value: "CR", label: "CR" }]}
              onChange={(value) => setForm({ ...form, tipo_tarjeta: value as NewCliente["tipo_tarjeta"] })}
            />
            <label className="switch-row">
              <input type="checkbox" checked={form.paz_y_salvo} onChange={(event) => setForm({ ...form, paz_y_salvo: event.target.checked })} />
              <span>Paz y salvo</span>
            </label>
          </div>
          <button className="primary-button" onClick={() => void createClient()}>Crear cliente</button>
        </section>
        <section className="panel">
          <h3>Preferencia</h3>
          <div className="inline-form">
            <Field label="Código de cliente" value={preferenceCode} onChange={setPreferenceCode} />
            <button className="secondary-button" onClick={() => void searchPreference()}>Consultar</button>
          </div>
          <p className="inline-status">{preference}</p>
        </section>
      </div>
      <section className="panel">
        <h3>Listado</h3>
        <DataTable
          columns={["Código", "Cliente", "Provincia", "Tarjeta", "Paz y salvo"]}
          rows={state.clientes.map((cliente) => [
            String(cliente.codigo_cliente),
            `${cliente.nombre} ${cliente.apellido}`,
            cliente.provincia.nombre,
            cliente.tipo_tarjeta,
            cliente.paz_y_salvo ? "Sí" : "No",
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
