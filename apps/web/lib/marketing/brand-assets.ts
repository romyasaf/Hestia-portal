/**
 * Official brand marks (PNG) under `public/brand/`.
 * Replace files here to update sitewide — then sync intrinsic sizes below if dimensions change.
 */
export const BRAND_LOGO_FILES = {
  /** Wide lockup — nav (desktop) */
  horizontal: "/brand/hestia-horizontal.png",
  /** Mark only — nav (mobile), favicon */
  icon: "/brand/hestia-icon.png",
  /** Full vertical lockup — footer on dark */
  stacked: "/brand/hestia-stacked.png"
} as const;

export type BrandLogoFileKey = keyof typeof BRAND_LOGO_FILES;

/** Pixel dimensions — from `sips -g pixelWidth -g pixelHeight` on each asset. */
export const BRAND_LOGO_INTRINSIC: Record<BrandLogoFileKey, { width: number; height: number }> = {
  horizontal: { width: 1024, height: 575 },
  icon: { width: 1024, height: 1011 },
  stacked: { width: 1024, height: 575 }
};
