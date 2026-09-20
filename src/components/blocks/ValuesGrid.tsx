import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import valueAuthentic from '@/assets/images/home/value-authentic.webp';
import valueBuilt from '@/assets/images/home/value-built.webp';
import valueCommitments from '@/assets/images/home/value-commitments.webp';

const VALUE_IMAGES = [valueBuilt, valueAuthentic, valueCommitments];

export async function ValuesGrid() {
  const t = await getTranslations('home');
  const values = t.raw('values') as Array<{ title: string; body: string }>;

  return (
    <section className="section-block border-t border-border">
      <div className="mx-auto max-w-7xl px-8">
        <div className="section-intro">
          <h2 className="text-3xl md:text-4xl">{t('valuesTitle')}</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {values.map((value, index) => (
            <article key={value.title} className="surface-card rounded-2xl p-6">
              <div className="mb-4 overflow-hidden rounded-xl">
                <Image
                  src={VALUE_IMAGES[index]}
                  alt={value.title}
                  width={480}
                  height={320}
                  className="h-40 w-full object-cover"
                />
              </div>
              <h3 className="text-xl">{value.title}</h3>
              <p className="mt-2 text-foreground-muted">{value.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
