export function isNumericCol(c: { base_type?: string; effective_type?: string }): boolean {
  const t = c.base_type ?? c.effective_type ?? "";
  return /Integer|Float|Decimal|Number|BigInteger/i.test(t);
}

export function isIntegerCol(c: { base_type?: string; effective_type?: string }): boolean {
  const t = c.base_type ?? c.effective_type ?? "";
  return /Integer|BigInteger/i.test(t);
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [95, 1, 111];
}
