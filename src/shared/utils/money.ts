/**
 * All monetary values are stored and computed as integer "poisha"
 * (1 BDT = 100 poisha) — never as JavaScript floating point numbers
 * (spec section 93). These helpers are the only place BDT <-> poisha
 * conversion should happen.
 */

export function bdtToPoisha(bdt: number): number {
  if (!Number.isFinite(bdt) || bdt < 0) {
    throw new Error("Invalid BDT amount");
  }
  return Math.round(bdt * 100);
}

export function poishaToBdt(poisha: number): number {
  return Math.round(poisha) / 100;
}

export function formatBdt(poisha: number): string {
  return `৳${poishaToBdt(poisha).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
