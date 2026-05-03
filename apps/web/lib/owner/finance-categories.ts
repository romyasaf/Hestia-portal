/** Company → owner recurring payables (fixed lease / operator rent). */
export const OWNER_PAYOUT_CATEGORY = "owner_payouts";

/** Subcategory for scheduled fixed-lease / operator installments. */
export const FIXED_LEASE_EXPENSE_SUBCATEGORY = "fixed_lease_payment";

/** Legacy slug on older rows — treat as owner liability alongside {@link OWNER_PAYOUT_CATEGORY}. */
export const OWNER_PAYMENT_CATEGORY_LEGACY = "owner_payment";

/** Hestia management fee income (commission and fixed fee accruals). */
export const MANAGEMENT_REVENUE_CATEGORY = "management_revenue";

export const COMMISSION_INCOME_SUBCATEGORY = "commission_income";

export const FIXED_MANAGEMENT_FEE_SUBCATEGORY = "fixed_management_fee";

export const OWNER_LIABILITY_CATEGORY_FILTERS = [
  OWNER_PAYOUT_CATEGORY,
  OWNER_PAYMENT_CATEGORY_LEGACY
] as const;
