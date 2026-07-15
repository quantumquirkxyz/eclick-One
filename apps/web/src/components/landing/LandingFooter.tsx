import { useI18n } from "../../i18n";

export function LandingFooter() { const { t } = useI18n(); return <footer className="landing-footer"><strong>eclick One</strong><span>{t("landing.footerPurpose")}</span><small>{t("landing.footerNote")}</small></footer>; }
