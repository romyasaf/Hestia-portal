-- Marketing / public listing fields on units (single model: ops + listing).
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS listing_title text,
  ADD COLUMN IF NOT EXISTS listing_description text,
  ADD COLUMN IF NOT EXISTS listing_monthly_price numeric(12, 2),
  ADD COLUMN IF NOT EXISTS listing_amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS listing_cover_image_url text,
  ADD COLUMN IF NOT EXISTS listing_gallery_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
