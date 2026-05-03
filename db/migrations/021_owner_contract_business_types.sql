-- Allow business-facing owner agreement types alongside legacy operator/managed.

ALTER TABLE owner_contracts DROP CONSTRAINT IF EXISTS owner_contracts_contract_type_check;

ALTER TABLE owner_contracts
  ADD CONSTRAINT owner_contracts_contract_type_check
  CHECK (contract_type IN ('operator', 'managed', 'fixed_lease', 'property_management'));
