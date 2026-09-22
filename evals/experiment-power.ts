/**
 * Sample size for the "Describe your trip" A/B (docs/experiment-describe.md):
 * `bun evals/experiment-power.ts`
 *
 * Two-sided two-proportion z-test, unpooled variance, equal arms:
 *   n per arm = (z₁₋α/₂ + z₁₋β)² · (p₁(1−p₁) + p₂(1−p₂)) / (p₂ − p₁)²
 * The baseline rate is unknown until the site has traffic, so it's a grid.
 */
export const Z_ALPHA = 1.959964; // α = 0.05, two-sided
export const Z_POWER = 0.841621; // power 0.80

export function nPerArm(p1: number, p2: number, za = Z_ALPHA, zb = Z_POWER) {
  return Math.ceil(((za + zb) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2))) / (p2 - p1) ** 2);
}

/** Smallest absolute lift detectable with n per arm at baseline p (normal approximation). */
export function mde(p: number, n: number, za = Z_ALPHA, zb = Z_POWER) {
  // Solve nPerArm(p, p + d) = n for d by bisection.
  let lo = 1e-6;
  let hi = 1 - p - 1e-6;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (nPerArm(p, p + mid, za, zb) > n) lo = mid;
    else hi = mid;
  }
  return hi;
}

if (import.meta.main) {
  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  console.log("\nSessions needed per arm (α 0.05 two-sided, power 0.80)\n");
  console.log("| baseline | +20% relative | +30% relative | +50% relative |");
  console.log("|---|---|---|---|");
  for (const p of [0.05, 0.1, 0.2])
    console.log(
      `| ${pct(p)} | ${[1.2, 1.3, 1.5].map((r) => nPerArm(p, p * r).toLocaleString()).join(" | ")} |`,
    );
  console.log("\nSmallest detectable lift at a 10% baseline\n");
  console.log("| sessions per arm | absolute | relative |");
  console.log("|---|---|---|");
  for (const n of [250, 500, 1000, 2500, 5000]) {
    const d = mde(0.1, n);
    console.log(`| ${n.toLocaleString()} | +${(d * 100).toFixed(1)} pts | +${pct(d / 0.1)} |`);
  }
}
