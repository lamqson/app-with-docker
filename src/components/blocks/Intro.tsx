import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function Intro() {
  const t = await getTranslations('home');

  return (
    <section className="section-block border-t border-border">
      <div className="mx-auto max-w-4xl px-8 section-intro">
        <h2 className="text-3xl md:text-4xl">{t('introTitle')}</h2>
        <p className="mt-4 text-lg text-foreground-muted">
          {t('introBody')}{' '}
          <Link href="/intake-orchestration" className="text-brand underline-offset-4 hover:underline">
            {t('introLinkIntake')}
          </Link>{' '}
          and the{' '}
          <Link href="/platform" className="text-brand underline-offset-4 hover:underline">
            {t('introLinkPlatform')}
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
