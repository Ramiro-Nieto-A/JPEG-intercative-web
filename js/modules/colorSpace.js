/**
 * Color space conversion utilities (RGB ↔ YCbCr).
 * The formulas follow the ITU‑R BT.601 standard.
 */
export function rgbToYCbCr(r, g, b) {
  const Y  = 0.299 * r + 0.587 * g + 0.114 * b;
  const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return { Y, Cb, Cr };
}

export function yCbCrToRGB(y, cb, cr) {
  const R = y + 1.402 * (cr - 128);
  const G = y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128);
  const B = y + 1.772 * (cb - 128);
  // Clamp to [0,255]
  return {
    R: Math.min(255, Math.max(0, Math.round(R))),
    G: Math.min(255, Math.max(0, Math.round(G))),
    B: Math.min(255, Math.max(0, Math.round(B)))
  };
}
