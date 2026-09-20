type ImagePlaceholderProps = {
  alt: string;
  className?: string;
};

export function ImagePlaceholder({ alt, className = '' }: ImagePlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={`flex aspect-[4/3] w-full items-center justify-center rounded-3xl border border-dashed border-border bg-background-muted px-6 text-center text-sm text-foreground-muted ${className}`}
    >
      Image pending
    </div>
  );
}
