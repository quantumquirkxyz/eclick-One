import { ArrowRight, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "../../i18n";

export function HeroSection() {
  const { t } = useI18n();
  return <section className="landing-hero"><div className="hero-copy"><span className="section-kicker">{t("landing.heroKicker")}</span><h1>{t("landing.heroTitle")}</h1><p>{t("landing.heroCopy")}</p><div className="hero-actions"><Link className="primary-button" to="/app">{t("landing.enterPanel")} <ArrowRight size={17} /></Link><a className="secondary-button" href="#arquitectura">{t("landing.viewArchitecture")}</a></div></div><div className="hero-card"><div className="status-line"><span className="status-dot" /> {t("landing.demoEnv")}</div><div className="hero-card-title"><img className="hero-logo" src="/eclick-One-Logo-2.svg" alt="eclick One logo" /><div><strong>eclick One</strong><span>{t("landing.console")}</span></div></div><div className="mini-grid"><span>{t("nav.customers")} <b>{t("landing.management")}</b></span><span>{t("nav.orders")} <b>{t("landing.tracking")}</b></span><span>{t("nav.payments")} <b>{t("landing.history")}</b></span><span>{t("nav.inventory")} <b>{t("landing.control")}</b></span></div></div></section>;
}
