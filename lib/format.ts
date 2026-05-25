/**
 * Small formatting helpers reused across the UI.
 */

/**
 * Returns an English ordinal string for a 1-based rank position.
 *   1 → "1st"
 *   2 → "2nd"
 *   3 → "3rd"
 *   4 → "4th"
 *   11 → "11th" (handles the teens correctly)
 *   21 → "21st"
 *   22 → "22nd"
 */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  // teens always end in "th"
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
