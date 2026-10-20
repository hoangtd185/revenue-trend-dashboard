/** Pick a "nice" axis maximum split into `ticks` equal steps (e.g. 2,910 -> 3,000 with 750 steps). */
export function niceScale(maxValue: number, ticks = 4): { max: number; step: number } {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return { max: 1000, step: 250 };
  const rawStep = maxValue / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const candidates = [1, 1.5, 2, 2.5, 3, 5, 7.5, 10];
  const factor = candidates.find((c) => c * magnitude >= rawStep) ?? 10;
  const step = factor * magnitude;
  return { max: step * ticks, step };
}
