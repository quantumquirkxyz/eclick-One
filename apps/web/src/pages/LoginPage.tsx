import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { FormErrorSummary, FieldMessage, useFormValidation } from "../components/forms/useFormValidation";
import { useAuth } from "../contexts/AuthContext";
import { LanguageSelector, useI18n } from "../i18n";
import { normalizeAppError } from "../services/api/client";

export function LoginPage() {
  const { t, locale } = useI18n();
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const values = { email, password };
  const validators = useMemo(() => ({
    email: [
      (value: string) => (value.trim().length === 0 ? t("auth.emailRequired") : null),
      (value: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : t("validation.emailInvalid")),
    ],
    password: [
      (value: string) => (value.length === 0 ? t("auth.passwordRequired") : null),
    ],
  }), [t]);
  const validation = useFormValidation({ values, validators });

  if (isLoading) {
    return <div className="resource-state"><p className="text-muted">{t("common.loading")}</p></div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate("/app", { replace: true });
    } catch (err: unknown) {
      setSubmitError(normalizeAppError(err, t("auth.loginError")).message);
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

          <FormErrorSummary
            title={t("validation.summaryTitle")}
            errors={Object.values(validation.errors).filter((error): error is string => Boolean(error))}
          />

          {submitError && (
            <div className="badge badge-error" style={{ display: "block", marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>
              {submitError}
            </div>
          )}

          <form onSubmit={(event) => validation.onSubmit(event, handleSubmit)} noValidate>
            <label className="field" style={{ marginBottom: 16 }}>
              <span>{t("auth.email")}</span>
              <input
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => validation.markBlurred("email")}
                placeholder={locale === "es" ? "correo@ejemplo.com" : "email@example.com"}
                disabled={submitting}
                autoComplete="email"
                autoCapitalize="off"
                aria-invalid={validation.shouldShowError("email")}
                aria-describedby={validation.getDescribedBy("email")}
                className={validation.shouldShowSuccess("email") ? "field-valid" : undefined}
              />
              <FieldMessage id="email-error" error={validation.getError("email")} />
            </label>
            <label className="field" style={{ marginBottom: 16 }}>
              <span>{t("auth.password")}</span>
              <input
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() => validation.markBlurred("password")}
                placeholder="••••••••"
                disabled={submitting}
                autoComplete="current-password"
                aria-invalid={validation.shouldShowError("password")}
                aria-describedby={validation.getDescribedBy("password")}
                className={validation.shouldShowSuccess("password") ? "field-valid" : undefined}
              />
              <FieldMessage id="password-error" error={validation.getError("password")} />
            </label>
            <label className="switch-row" style={{ marginBottom: 24 }}>
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={submitting} />
              {t("auth.remember")}
            </label>
            <button className="primary-button" type="submit" disabled={submitting || !validation.isValid} style={{ width: "100%", padding: "12px 14px", fontSize: 14 }}>
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
