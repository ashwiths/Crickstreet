/**
 * responsive.ts — Crickstreet Centralized Responsive Design System
 *
 * Usage:
 *   import { s, vs, ms, fs, sp, br, iconSz, isTablet } from '@/src/theme/responsive';
 *
 * All screens MUST use these helpers instead of raw pixel values in StyleSheet.
 * This mirrors how Swiggy, Zomato, Instagram, and WhatsApp handle multi-device scaling.
 */

import { Dimensions, PixelRatio } from 'react-native';

// ─── Base Reference Device (iPhone 14 / Pixel 6) ─────────────────────────────
const BASE_WIDTH  = 375;
const BASE_HEIGHT = 812;

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

// Clamp the scaling width/height so elements don't become massive on tablets/web
const SCALE_WIDTH = Math.min(WINDOW_WIDTH, 430);
const SCALE_HEIGHT = Math.min(WINDOW_HEIGHT, 932);

// ─── Is Tablet? ───────────────────────────────────────────────────────────────
export const isTablet = WINDOW_WIDTH >= 600;

// ─── Core Scaling Functions ───────────────────────────────────────────────────

/**
 * Horizontal scale — use for widths, icon sizes, horizontal padding/margin.
 * Linear proportional to screen width.
 */
export function s(size: number): number {
  return Math.round((SCALE_WIDTH / BASE_WIDTH) * size);
}

/**
 * Vertical scale — use for heights and vertical spacing.
 */
export function vs(size: number): number {
  return Math.round((SCALE_HEIGHT / BASE_HEIGHT) * size);
}

/**
 * Moderate scale — use for FONT SIZES and elements that should not grow
 * too aggressively on large screens. factor controls blend of linear vs fixed.
 * factor=0.5 means halfway between no scaling and full linear scaling.
 */
export function ms(size: number, factor = 0.5): number {
  return Math.round(size + (s(size) - size) * factor);
}

// Shorthand aliases
export { s as scale, vs as verticalScale, ms as moderateScale };

// ─── Device-Conditional Helper ────────────────────────────────────────────────

/**
 * Returns `phone` value on phones and `tablet` value on tablets.
 * Useful for grid column counts, max widths, etc.
 */
export function forDevice<T>(phone: T, tablet: T): T {
  return isTablet ? tablet : phone;
}

// ─── Typography Scale ─────────────────────────────────────────────────────────
// Moderate-scaled so fonts don't become enormous on tablets.

export const fs = {
  /** 8dp baseline — tiny labels, badges */
  xxs:  ms(8),
  /** 9dp — caption, secondary metadata */
  xs:   ms(9),
  /** 10dp — small labels */
  sm2:  ms(10),
  /** 11dp — helper text, timestamps */
  sm:   ms(11),
  /** 12dp — secondary body */
  base: ms(12),
  /** 13dp — body text, buttons */
  md:   ms(13),
  /** 14dp — slightly prominent body */
  md2:  ms(14),
  /** 15–16dp — section titles, input labels */
  lg:   ms(16),
  /** 18dp — card headings */
  xl:   ms(18),
  /** 20dp — screen titles */
  xl2:  ms(20),
  /** 22dp — hero numbers */
  xxl:  ms(22),
  /** 24–26dp — large headings */
  h2:   ms(24),
  /** 28dp — display headings */
  h1:   ms(28),
  /** 32dp — hero display */
  huge: ms(32),
  /** 48dp — welcome screen hero */
  hero: ms(48),
} as const;

// ─── Spacing System ───────────────────────────────────────────────────────────
// Horizontal scale used so spacing breathes proportionally.

export const sp = {
  /** 2 */  px2:  s(2),
  /** 4 */  xs:   s(4),
  /** 6 */  sm2:  s(6),
  /** 8 */  sm:   s(8),
  /** 10 */ md2:  s(10),
  /** 12 */ md:   s(12),
  /** 14 */ md3:  s(14),
  /** 16 */ lg:   s(16),
  /** 18 */ lg2:  s(18),
  /** 20 */ xl:   s(20),
  /** 24 */ xxl:  s(24),
  /** 28 */ xxl2: s(28),
  /** 32 */ xxxl: s(32),
  /** 40 */ h:    s(40),
  /** 48 */ hh:   s(48),
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const br = {
  /** 4 */ xs:   s(4),
  /** 6 */ sm2:  s(6),
  /** 8 */ sm:   s(8),
  /** 10 */ md2: s(10),
  /** 12 */ md:  s(12),
  /** 14 */ md3: s(14),
  /** 16 */ lg:  s(16),
  /** 20 */ xl:  s(20),
  /** 24 */ xxl: s(24),
  /** 28 */ h:   s(28),
  /** 9999 full pill */ full: 9999,
} as const;

// ─── Icon Sizes ───────────────────────────────────────────────────────────────

export const iconSz = {
  /** 12 */ xs:  s(12),
  /** 14 */ sm2: s(14),
  /** 16 */ sm:  s(16),
  /** 18 */ md2: s(18),
  /** 20 */ md:  s(20),
  /** 22 */ md3: s(22),
  /** 24 */ lg:  s(24),
  /** 28 */ xl:  s(28),
  /** 32 */ xxl: s(32),
  /** 36 */ xxxl: s(36),
} as const;

// ─── Avatar / Circle Sizes ────────────────────────────────────────────────────

export const avatarSz = {
  /** 24 */ xs:  s(24),
  /** 32 */ sm:  s(32),
  /** 40 */ md:  s(40),
  /** 44 */ md2: s(44),
  /** 48 */ lg:  s(48),
  /** 56 */ xl:  s(56),
  /** 60 */ xl2: s(60),
  /** 72 */ xxl: s(72),
  /** 80 */ h:   s(80),
  /** 100 */ hh: s(100),
} as const;

// ─── Screen Dimensions ────────────────────────────────────────────────────────

export const screen = {
  width:  WINDOW_WIDTH,
  height: WINDOW_HEIGHT,
  /** Usable width with standard 16dp horizontal padding on both sides */
  contentWidth: WINDOW_WIDTH - s(32),
  /** Pixel density */
  pixelRatio: PixelRatio.get(),
} as const;

// ─── Layout Helpers ───────────────────────────────────────────────────────────

/**
 * Calculate card width for N-column grid with gap.
 * @param columns   Number of columns
 * @param gap       Gap between columns (in scaled px)
 * @param hPad      Horizontal screen padding on each side (in scaled px)
 */
export function gridCardWidth(
  columns: number,
  gap: number = s(10),
  hPad: number = sp.lg,
): number {
  const totalGap  = gap * (columns - 1);
  const available = WINDOW_WIDTH - hPad * 2 - totalGap;
  return Math.floor(available / columns);
}

// ─── Hit Slop ─────────────────────────────────────────────────────────────────
// Consistent touch target expansion for small buttons

export const hitSlop = {
  small:  { top: s(8),  bottom: s(8),  left: s(8),  right: s(8)  },
  medium: { top: s(12), bottom: s(12), left: s(12), right: s(12) },
  large:  { top: s(16), bottom: s(16), left: s(16), right: s(16) },
} as const;

// ─── Min Touch Target ─────────────────────────────────────────────────────────
// WCAG / Apple HIG recommend minimum 44×44 logical pixels
export const MIN_TOUCH = s(44);
