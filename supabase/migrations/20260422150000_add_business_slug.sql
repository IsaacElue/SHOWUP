ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.businesses
SET slug = trim(both '-' from regexp_replace(lower(regexp_replace(name, '[^a-zA-Z0-9\\s-]', '', 'g')), '\\s+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_unique_idx
ON public.businesses(slug);
