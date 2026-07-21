import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { FieldMessage, FormErrorSummary, useFormValidation } from "../components/forms/useFormValidation";
import { useAuth } from "../contexts/AuthContext";
import { LanguageSelector, useI18n } from "../i18n";
import { normalizeAppError } from "../services/api/client";

export function RegisterPage() {
  const { t, locale } = useI18n();
  const { register, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const values = { nombre, apellido, email, password, confirmPassword };
  const validators = useMemo(() => ({
    nombre: [
      (value: string) => (value.trim().length === 0 ? t("auth.firstNameRequired") : null),
      (value: string) => (value.trim().length >= 2 ? null : t("validation.firstNameMin")),
    ],
    apellido: [
      (value: string) => (value.trim().length === 0 ? t("auth.lastNameRequired") : null),
      (value: string) => (value.trim().length >= 2 ? null : t("validation.lastNameMin")),
    ],
    email: [
      (value: string) => (value.trim().length === 0 ? t("auth.emailRequired") : null),
      (value: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? null : t("validation.emailInvalid")),
    ],
    password: [
      (value: string) => (value.length >= 8 ? null : t("validation.passwordMinLength")),
    ],
    confirmPassword: [
      (value: string) => (value.length === 0 ? t("auth.passwordRequired") : null),
      (value: string, current: typeof values) => (value === current.password ? null : t("validation.passwordMismatch")),
    ],
  }), [t, values]);
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
      await register({ email: email.trim(), nombre: nombre.trim(), apellido: apellido.trim(), password });
      navigate("/app", { replace: true });
    } catch (err: unknown) {
      setSubmitError(normalizeAppError(err, t("auth.registerError")).message);
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
            <div className="form-grid">
              <label className="field">
                <span>{t("customers.firstName")}</span>
                <input name="nombre" type="text" value={nombre} onChange={(event) => setNombre(event.target.value)} onBlur={() => validation.markBlurred("nombre")} placeholder={t("customers.firstName")} disabled={submitting} autoComplete="given-name" aria-invalid={validation.shouldShowError("nombre")} aria-describedby={validation.getDescribedBy("nombre")} className={validation.shouldShowSuccess("nombre") ? "field-valid" : undefined} />
                <FieldMessage id="nombre-error" error={validation.getError("nombre")} />
              </label>
              <label className="field">
                <span>{t("customers.lastName")}</span>
                <input name="apellido" type="text" value={apellido} onChange={(event) => setApellido(event.target.value)} onBlur={() => validation.markBlurred("apellido")} placeholder={t("customers.lastName")} disabled={submitting} autoComplete="family-name" aria-invalid={validation.shouldShowError("apellido")} aria-describedby={validation.getDescribedBy("apellido")} className={validation.shouldShowSuccess("apellido") ? "field-valid" : undefined} />
                <FieldMessage id="apellido-error" error={validation.getError("apellido")} />
              </label>
            </div>
            <label className="field" style={{ marginBottom: 16 }}>
              <span>{t("auth.email")}</span>
              <input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => validation.markBlurred("email")} placeholder={locale === "es" ? "correo@ejemplo.com" : "email@example.com"} disabled={submitting} autoComplete="email" autoCapitalize="off" aria-invalid={validation.shouldShowError("email")} aria-describedby={validation.getDescribedBy("email")} className={validation.shouldShowSuccess("email") ? "field-valid" : undefined} />
              <FieldMessage id="email-error" error={validation.getError("email")} />
            </label>
            <label className="field" style={{ marginBottom: 16 }}>
              <span>{t("auth.password")}</span>
              <input name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} onBlur={() => validation.markBlurred("password")} placeholder="••••••••" disabled={submitting} autoComplete="new-password" aria-invalid={validation.shouldShowError("password")} aria-describedby={validation.getDescribedBy("password", "password-hint")} className={validation.shouldShowSuccess("password") ? "field-valid" : undefined} />
              <FieldMessage id="password-error" error={validation.getError("password")} hint={<span id="password-hint">{t("auth.passwordHint")}</span>} />
            </label>
            <label className="field" style={{ marginBottom: 24 }}>
              <span>{t("auth.confirmPassword")}</span>
              <input name="confirmPassword" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} onBlur={() => validation.markBlurred("confirmPassword")} placeholder="••••••••" disabled={submitting} autoComplete="new-password" aria-invalid={validation.shouldShowError("confirmPassword")} aria-describedby={validation.getDescribedBy("confirmPassword")} className={validation.shouldShowSuccess("confirmPassword") ? "field-valid" : undefined} />
              <FieldMessage id="confirmPassword-error" error={validation.getError("confirmPassword")} />
            </label>
            <button className="primary-button" type="submit" disabled={submitting || !validation.isValid} style={{ width: "100%", padding: "12px 14px", fontSize: 14 }}>
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
