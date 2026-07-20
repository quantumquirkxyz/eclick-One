import { type ReactNode } from "react";
import { LanguageProvider } from "./i18n";

interface I18nContextValue {
  locale: "en" | "es";
  setLocale(locale: "en" | "es"): void;
  t(key: string, vars?: Record<string, string | number>): string;
  money(value: number): string;
  date(value: string): string;
  status(value: string): string;
  productName(code: number, fallback: string): string;
  categoryName(value: string): string;
  provinceName(code: string, fallback: string): string;
}

const mockI18n: I18nContextValue = {
  locale: "en",
  setLocale: () => {},
  t: (key: string) => key,
  money: (value: number) => `$${value.toFixed(2)}`,
  date: (value: string) => new Date(value).toISOString(),
  status: (value: string) => value,
  productName: (_code: number, fallback: string) => fallback,
  categoryName: (value: string) => value,
  provinceName: (_code: string, fallback: string) => fallback,
};

export function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  );
}

export { mockI18n };
