import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function ResourcesSection() {
  const t = await getTranslations('home');
  const resources = t.raw('resources') as string[];

  return (
    <section className="section-block border-t border-border">
      <div className="mx-auto max-w-7xl px-8">
        <div className="section-intro">
          <h2 className="text-3xl tracking-[0.12em] uppercase md:text-4xl">{t('resourcesTitle')}</h2>
        </div>
        <ul className="mx-auto grid max-w-4xl gap-4">
          {resources.map((title) => (
            <li key={title}>
              <Link
                href="/resources"
                className="surface-card flex rounded-2xl px-6 py-4 text-foreground transition-opacity hover:opacity-90"
              >
                {title}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10 text-center">
          <Link href="/resources" className="btn-secondary">
            {t('resourcesCta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
