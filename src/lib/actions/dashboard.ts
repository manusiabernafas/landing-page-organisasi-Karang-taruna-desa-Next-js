"use server";

import { getCashflowSeries, CASH_RANGES, type CashRange } from "@/lib/services/dashboard";
import { requireSession } from "@/lib/auth";

export async function cashflowAction(range: CashRange) {
  await requireSession();
  if (!(range in CASH_RANGES)) throw new Error("Rentang tidak valid.");
  return getCashflowSeries(range);
}
