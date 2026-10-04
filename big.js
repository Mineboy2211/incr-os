'use strict';
/* Big numbers as base-10 logarithms ("L numbers").
 *
 * A value x is stored as log10(x), and 0 is -Infinity. Plain JS numbers stop at
 * 1.79e308 (L 308.25); L numbers go far beyond with all the precision an
 * incremental needs. Multiplying is adding, dividing is subtracting, x^k is l*k.
 *
 * Note: JSON turns -Infinity into null, so saved L fields are restored with
 * Lnum() on load.
 */

const ZERO = -Infinity;

const L = {
  // plain number -> L
  of: x => (x > 0 ? Math.log10(x) : ZERO),
  // L -> plain number (Infinity past 1.79e308)
  num: l => Math.pow(10, l),
  // log10(10^a + 10^b)
  add(a, b) {
    if (a === ZERO) return b;
    if (b === ZERO) return a;
    const hi = Math.max(a, b), lo = Math.min(a, b);
    return hi + Math.log10(1 + Math.pow(10, lo - hi));
  },
  // log10(10^a - 10^b), clamped at zero
  sub(a, b) {
    if (b === ZERO) return a;
    if (b >= a) return ZERO;
    return a + Math.log10(-Math.expm1((b - a) * Math.LN10));
  },
};

// restore an L number from a save (null/garbage -> fallback)
const Lnum = (v, fallback) => (typeof v === 'number' && !isNaN(v) ? v : fallback);
