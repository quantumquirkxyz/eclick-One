# Bilingual UI Rules

If the project supports multiple languages, follow these patterns.

## Language Detection

On first load:
1. Check `localStorage` for saved language preference
2. If none, check browser language (`navigator.language`)
3. Default to the project's primary language

## Implementation

- Use a language provider React context at the app root
- Update `<html lang="...">` attribute on language change
- Send `Accept-Language` header with API requests
- Persist the choice in `localStorage`

## Translation Key Format

Every UI string must be in all supported locales.

```typescript
const en = {
  "orders.create.title": "New Order",
  "common.loading": "Loading...",
  "common.retry": "Retry",
};

const es = {
  "orders.create.title": "Nueva Orden",
  "common.loading": "Cargando...",
  "common.retry": "Reintentar",
};
```

## Rules

- Every new UI component must register all its strings in all locales
- No hardcoded strings in JSX — always use the translation function
- Translation values must make sense in context
- Account for text expansion (some languages are 20-30% longer)
- Error messages, toasts, and validation messages must all be translated

## API i18n

If the API returns user-facing messages, translate them server-side based on `Accept-Language` header. Keep messages in a single dictionary per locale.
