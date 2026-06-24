export function pressHeat(nSources: number, ageHours: number): number {
  return nSources / Math.pow(ageHours + 2, 1.5);
}
