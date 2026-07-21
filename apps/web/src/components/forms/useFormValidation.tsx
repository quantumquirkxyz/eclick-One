import { useMemo, useState, type FormEvent, type ReactNode } from "react";

type FieldErrors<T extends Record<string, unknown>> = Partial<Record<keyof T, string>>;
type TouchedFields<T extends Record<string, unknown>> = Partial<Record<keyof T, boolean>>;

export type FieldValidator<T extends Record<string, unknown>, K extends keyof T> = (value: T[K], values: T) => string | null;
export type ValidationSchema<T extends Record<string, unknown>> = {
  [K in keyof T]?: readonly FieldValidator<T, K>[];
};

export function useFormValidation<T extends Record<string, unknown>>({
  values,
  validators,
}: {
  values: T;
  validators: ValidationSchema<T>;
}) {
  const [touched, setTouched] = useState<TouchedFields<T>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo<FieldErrors<T>>(() => {
    const next: FieldErrors<T> = {};
    for (const key of Object.keys(validators) as (keyof T)[]) {
      const rules = validators[key] ?? [];
      for (const rule of rules) {
        const message = rule(values[key], values);
        if (message) {
          next[key] = message;
          break;
        }
      }
    }
    return next;
  }, [validators, values]);

  const isValid = Object.keys(errors).length === 0;

  function markBlurred(name: keyof T): void {
    setTouched((current) => (current[name] ? current : { ...current, [name]: true }));
  }

  function shouldShowError(name: keyof T): boolean {
    return Boolean(errors[name] && (touched[name] || submitted));
  }

  function shouldShowSuccess(name: keyof T): boolean {
    return Boolean(!errors[name] && touched[name] && hasValue(values[name]));
  }

  function getError(name: keyof T): string | null {
    return shouldShowError(name) ? errors[name] ?? null : null;
  }

  function getDescribedBy(name: keyof T, extraId?: string): string | undefined {
    const ids = [extraId, getError(name) ? `${String(name)}-error` : null].filter(Boolean);
    return ids.length ? ids.join(" ") : undefined;
  }

  function validateBeforeSubmit(form: HTMLFormElement | null): boolean {
    setSubmitted(true);
    setTouched(touchAll(values));
    if (isValid) {
      return true;
    }
    focusFirstError(form, errors);
    return false;
  }

  function resetValidation(): void {
    setTouched({});
    setSubmitted(false);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>, submit: () => void | Promise<void>): void {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateBeforeSubmit(form)) {
      return;
    }
    void submit();
  }

  return {
    errors,
    touched,
    submitted,
    isValid,
    markBlurred,
    shouldShowError,
    shouldShowSuccess,
    getError,
    getDescribedBy,
    validateBeforeSubmit,
    resetValidation,
    onSubmit,
  };
}

export function FormErrorSummary({
  title,
  errors,
}: {
  title: string;
  errors: readonly string[];
}) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="form-error-summary" role="alert" aria-live="assertive" tabIndex={-1}>
      <strong>{title}</strong>
      <ul>
        {errors.map((error, index) => (
          <li key={`${error}-${index}`}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

export function FieldMessage({
  id,
  error,
  hint,
}: {
  id: string;
  error?: string | null | undefined;
  hint?: ReactNode;
}) {
  if (error) {
    return (
      <span className="field-error-text" id={id} role="alert">
        {error}
      </span>
    );
  }
  if (hint) {
    return (
      <span className="field-help-text" id={id}>
        {hint}
      </span>
    );
  }
  return null;
}

function focusFirstError<T extends Record<string, unknown>>(form: HTMLFormElement | null, errors: FieldErrors<T>): void {
  if (!form) {
    return;
  }
  for (const fieldName of Object.keys(errors)) {
    const field = form.elements.namedItem(fieldName);
    if (field instanceof HTMLElement) {
      field.focus();
      field.scrollIntoView({ block: "center", behavior: "smooth" });
      break;
    }
  }
}

function touchAll<T extends Record<string, unknown>>(values: T): TouchedFields<T> {
  const touched: TouchedFields<T> = {};
  for (const key of Object.keys(values) as (keyof T)[]) {
    touched[key] = true;
  }
  return touched;
}

function hasValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "boolean") {
    return true;
  }
  return value !== null && value !== undefined;
}
