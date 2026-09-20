import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import rainBase from '@/assets/images/home/rain-base.webp';

export async function AgenticSection() {
  const t = await getTranslations('home');
  const bullets = t.raw('agenticBullets') as string[];

  return (
    <section className="section-block">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-8 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl md:text-5xl">{t('agenticTitle')}</h2>
          <p className="mt-4 text-lg text-foreground-muted">{t('agenticBody')}</p>
          <ul className="mt-8 space-y-3">
            {bullets.map((item) => (
              <li key={item} className="flex gap-3 text-foreground-muted">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                {item}
              </li>
            ))}
          </ul>
          <Link href="/agentic-ai" className="btn-primary mt-8">
            {t('agenticCta')}
          </Link>
        </div>
        <div className="surface-card overflow-hidden rounded-4xl p-3">
          <Image
            src={rainBase}
            alt={t('agenticTitle')}
            width={960}
            height={720}
            className="w-full rounded-3xl"
          />
        </div>
      </div>
    </section>
  );
}
