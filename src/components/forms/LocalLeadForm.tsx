'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

type LocalLeadFormProps = {
  source?: string;
};

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export function LocalLeadForm({ source = 'website' }: LocalLeadFormProps) {
  const t = useTranslations('form');
  const [state, setState] = useState<FormState>('idle');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('submitting');

    const formData = new FormData(event.currentTarget);
    const payload = {
      company: String(formData.get('company') ?? ''),
      email: String(formData.get('email') ?? ''),
      message: String(formData.get('message') ?? ''),
      name: String(formData.get('name') ?? ''),
      source,
    };

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      setState('success');
      event.currentTarget.reset();
    } catch {
      setState('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card mt-8 space-y-4 p-6">
      <div>
        <label htmlFor="lead-name" className="mb-1 block text-sm font-medium text-foreground">
          {t('name')}
        </label>
        <input
          id="lead-name"
          name="name"
          required
          autoComplete="name"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground"
        />
      </div>
      <div>
        <label htmlFor="lead-email" className="mb-1 block text-sm font-medium text-foreground">
          {t('email')}
        </label>
        <input
          id="lead-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground"
        />
      </div>
      <div>
        <label htmlFor="lead-company" className="mb-1 block text-sm font-medium text-foreground">
          {t('company')}
        </label>
        <input
          id="lead-company"
          name="company"
          autoComplete="organization"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground"
        />
      </div>
      <div>
        <label htmlFor="lead-message" className="mb-1 block text-sm font-medium text-foreground">
          {t('message')}
        </label>
        <textarea
          id="lead-message"
          name="message"
          rows={4}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground"
        />
      </div>
      <button type="submit" disabled={state === 'submitting'} className="btn-primary w-full">
        {state === 'submitting' ? t('submitting') : t('submit')}
      </button>
      {state === 'success' ? (
        <p className="text-sm text-brand" role="status">
          {t('success')}
        </p>
      ) : null}
      {state === 'error' ? (
        <p className="text-sm text-foreground" role="alert">
          {t('error')}
        </p>
      ) : null}
    </form>
  );
}
