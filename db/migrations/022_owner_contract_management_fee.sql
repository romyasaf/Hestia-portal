-- Property management agreements: fee structure and calculation basis.

ALTER TABLE owner_contracts
  ADD COLUMN IF NOT EXISTS management_fee_structure TEXT
    CHECK (
      management_fee_structure IS NULL
      OR management_fee_structure IN ('percentage', 'fixed_monthly', 'hybrid')
    );

ALTER TABLE owner_contracts
  ADD COLUMN IF NOT EXISTS management_fee_percentage NUMERIC(6, 3);

ALTER TABLE owner_contracts
  ADD COLUMN IF NOT EXISTS monthly_management_fee_amount NUMERIC(12, 2);

ALTER TABLE owner_contracts
  ADD COLUMN IF NOT EXISTS fee_calculation_basis TEXT
    CHECK (
      fee_calculation_basis IS NULL
      OR fee_calculation_basis IN ('before_expenses', 'after_expenses')
    );
