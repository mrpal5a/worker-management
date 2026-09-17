import Decimal from 'decimal.js';

/**
 * Convert a value arriving from PostgREST into a Decimal.
 *
 * PostgREST serializes `numeric` columns as unquoted JSON numbers, so they
 * reach us as JS doubles. Routing through String() first is lossless for the
 * magnitudes this app handles: JS prints the shortest representation that
 * round-trips, so 606.07 stringifies back to "606.07" rather than its exact
 * binary expansion.
 *
 * This is the single boundary where database values become Decimal. Nothing
 * downstream should do arithmetic on a raw number.
 */
export function toDecimal(value: number | string | null | undefined): Decimal {
  if (value === null || value === undefined) return new Decimal(0);
  return new Decimal(String(value));
}
