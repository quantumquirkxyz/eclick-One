import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LanguageSelector, useI18n } from "../i18n";

export function LoginPage() {
  const { t, locale } = useI18n();
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
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

    if (!email.trim()) {
      setError(t("auth.emailRequired"));
      return;
    }
    if (!password) {
      setError(t("auth.passwordRequired"));
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate("/app", { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("auth.loginError");
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
          <Link className="primary-button" to="/register">{t("auth.register")}</Link>
        </div>
      </header>
      <main style={{ maxWidth: 420, margin: "60px auto", padding: "0 28px" }}>
        <div className="panel" style={{ padding: 32 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>{t("auth.loginTitle")}</h1>
          <p className="text-muted" style={{ marginBottom: 24, fontSize: 14 }}>{t("auth.loginSubtitle")}</p>

          {error && (
            <div className="badge badge-error" style={{ display: "block", marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field" style={{ marginBottom: 16 }}>
              <span>{t("auth.email")}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={locale === "es" ? "correo@ejemplo.com" : "email@example.com"}
                disabled={submitting}
                autoComplete="email"
                required
              />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <span>{t("auth.password")}</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                disabled={submitting}
                autoComplete="current-password"
                required
              />
            </div>
            <label className="switch-row" style={{ marginBottom: 24 }}>
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={submitting} />
              {t("auth.remember")}
            </label>
            <button className="primary-button" type="submit" disabled={submitting} style={{ width: "100%", padding: "12px 14px", fontSize: 14 }}>
              {submitting ? t("common.loading") : t("auth.signIn")}
            </button>
          </form>

          <p className="text-muted" style={{ marginTop: 20, fontSize: 13, textAlign: "center" }}>
            {t("auth.noAccount")} <Link to="/register" style={{ color: "var(--color-accent)", fontWeight: 700 }}>{t("auth.registerLink")}</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
