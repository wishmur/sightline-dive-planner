import { expect, test } from "bun:test";
import { mde, nPerArm } from "./experiment-power";

test("sample size matches the textbook formula", () => {
  // 10% → 12%: 7.849 · (0.09 + 0.1056) / 0.0004 ≈ 3,838.4 → 3,839 per arm.
  expect(nPerArm(0.1, 0.12)).toBe(3839);
  // Larger effects need fewer sessions.
  expect(nPerArm(0.1, 0.15)).toBeLessThan(nPerArm(0.1, 0.12));
});

test("the detectable lift is the inverse of the sample size", () => {
  const d = mde(0.1, 3839);
  expect(d).toBeCloseTo(0.02, 3);
  expect(mde(0.1, 500)).toBeGreaterThan(mde(0.1, 5000));
});
