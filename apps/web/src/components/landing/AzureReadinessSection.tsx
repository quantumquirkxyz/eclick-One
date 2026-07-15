import { useI18n } from "../../i18n";

export function AzureReadinessSection() { const { t } = useI18n(); return <section className="readiness"><div><span className="section-kicker">AZURE SQL READINESS</span><h2>{t("landing.readinessTitle")}</h2><p>{t("landing.readinessCopy")}</p></div><div className="readiness-code"><code>REPOSITORY_MODE=mock</code><code>REPOSITORY_MODE=sql</code><code>app.vw_*</code><code>app.usp_*</code></div></section>; }
