import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-4 py-24">
      <h1 className="font-display text-4xl font-semibold">{t('title')}</h1>
      <p className="text-foreground-muted">{t('body')}</p>
      <Link href="/" className="text-sm font-semibold text-brand">
        {t('back')}
      </Link>
    </section>
  );
}
