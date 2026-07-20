import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LanguageSelector, useI18n } from "../i18n";

export function RegisterPage() {
  const { t, locale } = useI18n();
  const { register, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return <div className="resource-state"><p className="text-muted">{t("common.loading")}</p></div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError(t("auth.firstNameRequired"));
      return;
    }
    if (!apellido.trim()) {
      setError(t("auth.lastNameRequired"));
      return;
    }
    if (!email.trim()) {
      setError(t("auth.emailRequired"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.passwordMinLength"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      await register({ email: email.trim(), nombre: nombre.trim(), apellido: apellido.trim(), password });
      navigate("/app", { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("auth.registerError");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="public-site">
      <header className="public-header">
        <Link to="/" className="public-brand">
          <img className="public-logo" src="/eclick-One-Logo-2.svg" alt="eclick One logo" />
          <div><strong>eclick One</strong><small>{t("shell.operations")}</small></div>
        </Link>
        <div className="public-actions">
          <LanguageSelector />
          <Link className="primary-button" to="/login">{t("auth.signIn")}</Link>
        </div>
      </header>
      <main style={{ maxWidth: 420, margin: "60px auto", padding: "0 28px" }}>
        <div className="panel" style={{ padding: 32 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>{t("auth.registerTitle")}</h1>
          <p className="text-muted" style={{ marginBottom: 24, fontSize: 14 }}>{t("auth.registerSubtitle")}</p>

          {error && (
            <div className="badge badge-error" style={{ display: "block", marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field">
                <span>{t("customers.firstName")}</span>
                <input type="text" value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder={t("customers.firstName")} disabled={submitting} autoComplete="given-name" required />
              </div>
              <div className="field">
                <span>{t("customers.lastName")}</span>
                <input type="text" value={apellido} onChange={(event) => setApellido(event.target.value)} placeholder={t("customers.lastName")} disabled={submitting} autoComplete="family-name" required />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <span>{t("auth.email")}</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={locale === "es" ? "correo@ejemplo.com" : "email@example.com"} disabled={submitting} autoComplete="email" required />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <span>{t("auth.password")}</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" disabled={submitting} autoComplete="new-password" required />
              <span style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{t("auth.passwordHint")}</span>
            </div>
            <div className="field" style={{ marginBottom: 24 }}>
              <span>{t("auth.confirmPassword")}</span>
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="••••••••" disabled={submitting} autoComplete="new-password" required />
            </div>
            <button className="primary-button" type="submit" disabled={submitting} style={{ width: "100%", padding: "12px 14px", fontSize: 14 }}>
              {submitting ? t("common.loading") : t("auth.createAccount")}
            </button>
          </form>

          <p className="text-muted" style={{ marginTop: 20, fontSize: 13, textAlign: "center" }}>
            {t("auth.haveAccount")} <Link to="/login" style={{ color: "var(--color-accent)", fontWeight: 700 }}>{t("auth.signIn")}</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
