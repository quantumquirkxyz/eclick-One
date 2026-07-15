# Bilingual UI Rules

## Language Detection

On first load:
1. Check `localStorage` for key `eclick-one-locale`
2. If saved value is `"en"` or `"es"`, use it
3. If no saved value, check `navigator.language` — if starts with `es`, use Spanish
4. Otherwise default to English

## Implementation

- `LanguageProvider` React context at the app root (`apps/web/src/i18n.tsx`)
- `useI18n()` hook returns `{ locale, setLocale, t, money, date, status, productName, categoryName, provinceName }`
- `t(key, vars?)` — translates key, supports `{var}` interpolation
- `money(value)` — `Intl.NumberFormat` with USD, locale-aware
- `date(value)` — `Intl.DateTimeFormat` with locale-aware formatting
- `status(value)` — translates `generado → "Generated"/"Generado"` etc.
- `productName(code, fallback)` — maps codes 1000-1003 to EN/ES names
- `categoryName(value)` — maps "Technology"/"Office" to EN/ES
- `provinceName(code, fallback)` — maps PA/CH/CO/OC to EN/ES names
- `<html lang="...">` updated on language change
- `Accept-Language` header sent with API requests
- Choice persisted in `localStorage`

## Translation Dictionary

~213 keys per locale organized by feature prefix (`common.*`, `nav.*`, `shell.*`, `landing.*`, `dashboard.*`, `customers.*`, `orders.*`, `payments.*`, `products.*`, `inventory.*`, `reports.*`, `notFound.*`, `status.*`).

Bilingual error messages also exist server-side in `apps/api/src/i18n.ts` (~40 messages, key error translations mapped to Spanish).

## Rules

- Every new UI component must register all its strings in both locales
- No hardcoded English strings in JSX — always use the `t()` function
- Translation values must make sense in context (no machine-translated placeholders)
- Account for text expansion: Spanish text is typically 20-30% longer than English
- Error messages, toasts, and validation messages must all be translated
