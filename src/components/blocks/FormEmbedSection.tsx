import { LeadForm } from '@/components/forms/LeadForm';
import type { FormEmbedBlock } from '@/payload/payload-types';

type FormEmbedSectionProps = {
  block: FormEmbedBlock;
};

export async function FormEmbedSection({ block }: FormEmbedSectionProps) {
  return (
    <section className="section-block">
      <div className="mx-auto max-w-2xl px-8">
        {block.headline ? <h2 className="text-center text-3xl md:text-4xl">{block.headline}</h2> : null}
        {block.description ? (
          <p className="mt-4 text-center text-foreground-muted">{block.description}</p>
        ) : null}
        <LeadForm formIdOverride={block.formId} source={block.headline ?? 'cms-form'} />
      </div>
    </section>
  );
}
