import { ShieldCheck } from "lucide-react";
import { useI18n } from "../../i18n";

export function AcademicScopeSection() { const { t } = useI18n(); return <section className="landing-section rules-section" id="reglas"><div className="section-heading"><div><span className="section-kicker">{t("landing.rulesKicker")}</span><h2>{t("landing.rulesTitle")}</h2></div><p>{t("landing.rulesCopy")}</p></div><div className="rules-grid"><Rule title={t("landing.pazTitle")} copy={t("landing.pazCopy")} /><Rule title={t("landing.payBeforeTitle")} copy={t("landing.payBeforeCopy")} /><Rule title={t("landing.timeTitle")} copy={t("landing.timeCopy")} /><Rule title={t("landing.traceTitle")} copy={t("landing.traceCopy")} /></div></section>; }
function Rule({ title, copy }: { title: string; copy: string }) { return <article className="rule"><ShieldCheck size={18} /><div><h3>{title}</h3><p>{copy}</p></div></article>; }
