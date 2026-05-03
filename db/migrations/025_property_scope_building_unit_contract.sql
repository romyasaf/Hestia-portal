-- Separate physical property from ownership/contracts:
-- properties: type + management status; units: floor + ownership_source;
-- owner_contracts: property_scope, contract_status, revenue_calculation_method (renamed), fee vocabulary.

-- --- Properties ---
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS property_type TEXT NOT NULL DEFAULT 'apartment_building';

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS management_status TEXT NOT NULL DEFAULT 'managed_by_hestia';

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;
ALTER TABLE properties ADD CONSTRAINT properties_property_type_check CHECK (
  property_type IN (
    'apartment_building',
    'villa',
    'compound',
    'commercial_building',
    'mixed_use'
  )
);

ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_management_status_check;
ALTER TABLE properties ADD CONSTRAINT properties_management_status_check CHECK (
  management_status IN ('managed_by_hestia', 'location_only_not_managed')
);

-- --- Units ---
ALTER TABLE units
  ADD COLUMN IF NOT EXISTS floor TEXT;

ALTER TABLE units
  ADD COLUMN IF NOT EXISTS ownership_source TEXT NOT NULL DEFAULT 'no_owner_contract';

ALTER TABLE units
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE units DROP CONSTRAINT IF EXISTS units_ownership_source_check;
ALTER TABLE units ADD CONSTRAINT units_ownership_source_check CHECK (
  ownership_source IN (
    'inherited_from_building_contract',
    'direct_unit_owner_contract',
    'no_owner_contract'
  )
);

UPDATE units
SET ownership_source = 'direct_unit_owner_contract'
WHERE owner_user_id IS NOT NULL
  AND ownership_source = 'no_owner_contract';

-- --- Owner contracts: drop old CHECKs, rename basis column, new columns ---
ALTER TABLE owner_contracts DROP CONSTRAINT IF EXISTS owner_contracts_management_fee_structure_check;
ALTER TABLE owner_contracts DROP CONSTRAINT IF EXISTS owner_contracts_fee_calculation_basis_check;

ALTER TABLE owner_contracts RENAME COLUMN fee_calculation_basis TO revenue_calculation_method;

UPDATE owner_contracts
SET management_fee_structure = CASE management_fee_structure
  WHEN 'percentage' THEN 'commission_based_fee'
  WHEN 'fixed_monthly' THEN 'fixed_monthly_management_fee'
  WHEN 'hybrid' THEN 'hybrid_fee_structure'
  ELSE management_fee_structure
END
WHERE management_fee_structure IS NOT NULL;

UPDATE owner_contracts
SET revenue_calculation_method = CASE revenue_calculation_method
  WHEN 'before_expenses' THEN 'gross_revenue_basis'
  WHEN 'after_expenses' THEN 'net_revenue_basis'
  ELSE revenue_calculation_method
END
WHERE revenue_calculation_method IS NOT NULL;

ALTER TABLE owner_contracts
  ADD COLUMN IF NOT EXISTS property_scope TEXT;

ALTER TABLE owner_contracts
  ADD COLUMN IF NOT EXISTS contract_status TEXT;

UPDATE owner_contracts oc
SET property_scope = CASE
  WHEN p.ownership_scope = 'unit_owner' THEN 'specific_units'
  ELSE 'whole_building'
END
FROM owner_profiles p
WHERE p.user_id = oc.owner_user_id
  AND oc.property_scope IS NULL;

UPDATE owner_contracts
SET contract_status = CASE
  WHEN end_date < CURRENT_DATE THEN 'expired'
  WHEN start_date > CURRENT_DATE THEN 'upcoming'
  ELSE 'active'
END
WHERE contract_status IS NULL;

ALTER TABLE owner_contracts DROP CONSTRAINT IF EXISTS owner_contracts_property_scope_check;
ALTER TABLE owner_contracts ADD CONSTRAINT owner_contracts_property_scope_check CHECK (
  property_scope IS NULL
  OR property_scope IN ('whole_building', 'specific_units', 'whole_villa')
);

ALTER TABLE owner_contracts DROP CONSTRAINT IF EXISTS owner_contracts_contract_status_check;
ALTER TABLE owner_contracts ADD CONSTRAINT owner_contracts_contract_status_check CHECK (
  contract_status IS NULL
  OR contract_status IN ('upcoming', 'active', 'expired')
);

ALTER TABLE owner_contracts ADD CONSTRAINT owner_contracts_management_fee_structure_check CHECK (
  management_fee_structure IS NULL
  OR management_fee_structure IN (
    'commission_based_fee',
    'fixed_monthly_management_fee',
    'hybrid_fee_structure'
  )
);

ALTER TABLE owner_contracts ADD CONSTRAINT owner_contracts_revenue_calculation_method_check CHECK (
  revenue_calculation_method IS NULL
  OR revenue_calculation_method IN ('gross_revenue_basis', 'net_revenue_basis')
);

-- Whole-villa contracts: single villa property, no unit rows.
UPDATE owner_contracts oc
SET property_scope = 'whole_villa'
FROM properties pr
WHERE pr.id = oc.property_id
  AND pr.property_type = 'villa'
  AND oc.unit_id IS NULL
  AND (oc.applies_to_unit_ids IS NULL OR oc.applies_to_unit_ids = '[]'::jsonb)
  AND oc.property_scope = 'whole_building';

UPDATE owner_contracts SET property_scope = 'whole_building' WHERE property_scope IS NULL;
