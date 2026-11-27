import { useState, type FormEvent } from 'react';
import { authCopy } from '../authMessages';

export function useAuthFields() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setError = (id: string, message: string) => setErrors(current => ({ ...current, [id]: message }));
  return {
    setError,
    form: {
      onInvalidCapture(event: FormEvent<HTMLFormElement>) {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || !input.id) return;
        event.preventDefault();
        const { validity, id } = input;
        const message = validity.valueMissing ? authCopy.required
          : validity.typeMismatch ? authCopy.email
          : validity.tooShort ? authCopy.passwordLength
          : validity.patternMismatch ? authCopy.otpFormat : 'Check this field and try again.';
        setError(id, message);
        if (event.currentTarget.querySelector(':invalid') === input) input.focus();
      },
      onInputCapture(event: FormEvent<HTMLFormElement>) {
        if (event.target instanceof HTMLInputElement && errors[event.target.id]) setError(event.target.id, '');
      },
    },
    input: (id: string) => ({
      'aria-invalid': errors[id] ? true : undefined,
      'aria-describedby': errors[id] ? `${id}-error` : undefined,
    }),
    message: (id: string) => errors[id] && <p className="mt-1.5 text-xs font-medium text-[#98211A]" id={`${id}-error`} aria-live="polite">{errors[id]}</p>,
  };
}

export function AuthBackLinks({ onNavigateLogin, onNavigateHome }: {
  onNavigateLogin: () => void;
  onNavigateHome: () => void;
}) {
  return <nav aria-label="Account navigation" className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-[#1E3A2F]">
    <a href="/login" className="underline-offset-4 hover:underline" onClick={event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      onNavigateLogin();
    }}>Back to sign in</a>
    <a href="/customer-home" className="underline-offset-4 hover:underline" onClick={event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      onNavigateHome();
    }}>Back to home</a>
  </nav>;
}
