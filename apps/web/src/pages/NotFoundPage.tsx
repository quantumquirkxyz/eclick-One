import { Link } from "react-router-dom";
import { useI18n } from "../i18n";

export function NotFoundPage() {
  const { t } = useI18n();
  return <main className="not-found"><span className="brand-mark">e</span><p className="eyebrow">eclick One</p><h1>{t("notFound.title")}</h1><p>{t("notFound.copy")}</p><Link className="primary-button" to="/">{t("notFound.back")}</Link></main>;
}
