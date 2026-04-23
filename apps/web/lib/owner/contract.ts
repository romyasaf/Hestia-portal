export const OWNER_CONTRACT_TYPES = ["operator", "managed"] as const;

export type OwnerContractType = (typeof OWNER_CONTRACT_TYPES)[number];

export function parseOwnerContractType(raw: string | null | undefined): OwnerContractType {
  return raw === "operator" ? "operator" : "managed";
}

export function isOperatorContract(raw: string | null | undefined): boolean {
  return raw === "operator";
}
