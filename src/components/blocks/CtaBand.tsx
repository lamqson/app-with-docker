import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function CtaBand() {
  const t = await getTranslations('home');

  return (
    <section className="section-block">
      <div className="mx-auto max-w-7xl px-8">
        <div className="surface-card relative overflow-hidden rounded-4xl border border-border bg-surface-elevated p-10 md:p-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--hero-glow),transparent_70%)]"
          />
          <div className="relative text-center">
            <h2 className="text-3xl md:text-4xl">{t('ctaTitle')}</h2>
            <Link href="/contact" className="btn-primary mt-8">
              {t('ctaButton')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
