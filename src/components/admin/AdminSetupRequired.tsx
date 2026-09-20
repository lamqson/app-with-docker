export default function AdminSetupRequired() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-foreground-muted">
        Payload CMS
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin requires a database</h1>
      <p className="mt-4 text-base leading-relaxed text-foreground-muted">
        This site is running in static mode without a Postgres connection. The public pages work
        from build-time content, but the CMS admin needs{' '}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">DATABASE_URL</code> on Netlify.
      </p>
      <ol className="mt-8 list-decimal space-y-4 pl-5 text-sm leading-relaxed text-foreground-muted">
        <li>
          Add Postgres via Netlify Extensions (Neon) or paste a connection string as{' '}
          <code className="rounded bg-muted px-1.5 py-0.5">DATABASE_URL</code> in Site
          configuration → Environment variables.
        </li>
        <li>
          Set <code className="rounded bg-muted px-1.5 py-0.5">PAYLOAD_SECRET</code> and{' '}
          <code className="rounded bg-muted px-1.5 py-0.5">NEXT_PUBLIC_SITE_URL</code> if not
          already configured.
        </li>
        <li>Redeploy so migrations run during build (<code className="rounded bg-muted px-1.5 py-0.5">npm run ci</code>).</li>
        <li>
          Seed content once from your machine:{' '}
          <code className="block mt-2 overflow-x-auto rounded bg-muted px-3 py-2 text-xs">
            DATABASE_URL=&quot;postgres://...&quot; PAYLOAD_SECRET=&quot;...&quot; npm run db:seed
          </code>
        </li>
      </ol>
      <p className="mt-8 text-sm text-foreground-muted">
        See <code className="rounded bg-muted px-1.5 py-0.5">README.md</code> → Deploy to Netlify
        for full setup steps.
      </p>
    </main>
  );
}
