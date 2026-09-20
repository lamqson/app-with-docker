import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function TestimonialSection() {
  const t = await getTranslations('home');

  return (
    <section className="section-block">
      <div className="mx-auto max-w-7xl px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <blockquote className="surface-card rounded-4xl border-l-[10px] border-l-brand p-8">
            <p className="text-xl text-foreground">&ldquo;{t('quoteText')}&rdquo;</p>
            <footer className="mt-6">
              <p className="font-medium text-foreground">{t('quoteAuthor')}</p>
              <p className="text-sm text-foreground-muted">{t('quoteRole')}</p>
            </footer>
          </blockquote>
          <article className="surface-card flex flex-col justify-center rounded-4xl bg-surface-elevated p-8">
            <p className="text-4xl text-foreground">{t('caseStat')}</p>
            <p className="mt-2 text-lg text-foreground-muted">{t('caseDetail')}</p>
          </article>
        </div>
        <div className="mt-12 text-center">
          <h2 className="text-2xl md:text-3xl">{t('reviewsTitle')}</h2>
          <Link href="/customer-success" className="btn-primary mt-6">
            {t('reviewsCta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
