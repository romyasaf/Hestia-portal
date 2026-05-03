-- Structured building address (Qatar-style). Removes legacy address_line_1.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS address_zone TEXT NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS address_street TEXT NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS address_building_number TEXT NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS address_area_name TEXT,
  ADD COLUMN IF NOT EXISTS address_notes TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'properties'
      AND column_name = 'address_line_1'
  ) THEN
    UPDATE properties
    SET
      address_notes = CASE
        WHEN address_line_1 IS NOT NULL AND btrim(address_line_1) <> '' THEN
          concat_ws(
            E'\n',
            NULLIF(trim(address_notes), ''),
            'Legacy line 1: ' || address_line_1
          )
        ELSE address_notes
      END
    WHERE true;

    ALTER TABLE properties DROP COLUMN address_line_1;
  END IF;
END $$;
