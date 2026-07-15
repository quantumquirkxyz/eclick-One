import { ArrowRight, Database, Route, ShieldCheck, type LucideIcon } from "lucide-react";
import { useI18n } from "../../i18n";

const architecture: readonly [LucideIcon, "Frontend React" | "API REST Bun" | "landing.domainServices" | "landing.mockRepos" | "landing.futureSql"][] = [[Route, "Frontend React"], [ArrowRight, "API REST Bun"], [ShieldCheck, "landing.domainServices"], [Database, "landing.mockRepos"], [Database, "landing.futureSql"]];

export function ArchitectureSection() { const { t } = useI18n(); return <section className="landing-section architecture-section" id="arquitectura"><div className="section-heading"><div><span className="section-kicker">{t("landing.architecture").toUpperCase()}</span><h2>{t("landing.archTitle")}</h2></div><p>{t("landing.archCopy")}</p></div><div className="architecture-flow">{architecture.map(([Icon, label], index) => <div className="architecture-node" key={label}><Icon size={20} /><span>{label.startsWith("landing.") ? t(label as "landing.domainServices" | "landing.mockRepos" | "landing.futureSql") : label}</span>{index < 4 ? <b>→</b> : null}</div>)}</div></section>; }
