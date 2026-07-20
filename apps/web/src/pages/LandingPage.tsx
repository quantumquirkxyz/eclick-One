import { AcademicScopeSection } from "../components/landing/AcademicScopeSection";
import { ArchitectureSection } from "../components/landing/ArchitectureSection";
import { AzureReadinessSection } from "../components/landing/AzureReadinessSection";
import { HeroSection } from "../components/landing/HeroSection";
import { LandingFooter } from "../components/landing/LandingFooter";
import { ModuleGrid } from "../components/landing/ModuleGrid";
import { LanguageSelector, useI18n } from "../i18n";

export function LandingPage() {
  const { t } = useI18n();
  return <>
    <header className="public-header"><a className="public-brand" href="/"><img className="public-logo" src="/eclick-One-Logo-2.svg" alt="eclick One logo" /><span><strong>eclick One</strong><small>{t("landing.brandScope")}</small></span></a><nav><a href="#modulos">{t("landing.modules")}</a><a href="#arquitectura">{t("landing.architecture")}</a><a href="#reglas">{t("landing.rules")}</a></nav><div className="public-actions"><LanguageSelector /><a className="primary-button" href="/login">{t("landing.enterPanel")} <span aria-hidden="true">→</span></a></div></header>
    <main><HeroSection /><ModuleGrid /><ArchitectureSection /><AcademicScopeSection /><AzureReadinessSection /></main>
    <LandingFooter />
  </>;
}
