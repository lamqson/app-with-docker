import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function SolutionsGrid() {
  const t = await getTranslations('home');
  const solutions = t.raw('solutions') as Array<{ title: string; body: string }>;

  return (
    <section className="section-block border-t border-border">
      <div className="mx-auto max-w-7xl px-8">
        <div className="section-intro">
          <h2 className="text-3xl tracking-[0.12em] uppercase md:text-4xl">{t('solutionsTitle')}</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {solutions.map((item) => (
            <article key={item.title} className="surface-card rounded-2xl p-6">
              <h3 className="text-xl">{item.title}</h3>
              <p className="mt-3 text-foreground-muted">{item.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/solutions" className="btn-secondary">
            {t('solutionsCta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
