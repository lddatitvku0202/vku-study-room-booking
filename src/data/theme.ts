/**
 * Design tokens — the single canonical source of visual values for the app.
 *
 * Every colour, spacing step, radius and text style used anywhere in the UI
 * comes from here. Hard-coded values in a component or screen are a defect:
 * they are what make screens drift apart visually and make a restyle a
 * repo-wide search-and-replace.
 *
 * Pure layer (`src/data`): no React, no `react-native`, no I/O. The objects are
 * declared `as const`, which keeps values as literal types — that is what lets
 * `typography.title` drop straight into `StyleSheet.create` without importing
 * React Native's `TextStyle` here and without a cast.
 *
 * Scope note: light theme only. Dark mode and theme switching are deliberately
 * out of scope — adding a second palette now would double the surface with no
 * screen yet to test it against.
 */

/**
 * Colour palette.
 *
 * Contrast was chosen for legibility on a phone in a bright room: `text`,
 * `textSecondary`, `primary`, `success`, `warning` and `error` all clear the
 * WCAG AA 4.5:1 ratio against `surface`/`background`. `disabled` intentionally
 * does not — it marks inert controls, which AA exempts.
 */
export const colors = {
  /** Primary brand colour — actions, active states, links. */
  primary: '#1D4ED8',
  /** Pressed/emphasis variant of `primary`. */
  primaryDark: '#1E3A8A',
  /** App canvas behind content. */
  background: '#F8FAFC',
  /** Cards, sheets and raised surfaces. */
  surface: '#FFFFFF',
  /** Primary reading text. */
  text: '#0F172A',
  /** Supporting text, labels, metadata. */
  textSecondary: '#475569',
  /** Hairlines, dividers, input outlines. */
  border: '#E2E8F0',
  /** Confirmed booking, successful action. */
  success: '#15803D',
  /** Caution — expiring slot, partial state. */
  warning: '#B45309',
  /** Failure — booking conflict, validation error. */
  error: '#B91C1C',
  /** Unavailable control or taken slot. */
  disabled: '#94A3B8',
} as const;

/** Spacing scale, in points. Use these instead of arbitrary margins. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Corner radii, in points. */
export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
} as const;

/**
 * Text styles. Each is a complete style object, so a component applies one
 * token rather than assembling size, height and weight by hand.
 */
export const typography = {
  /** Screen titles. */
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  /** Section and card headings. */
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  /** Default body copy. */
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  /** Metadata, helper text, timestamps. */
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const;

/**
 * Fixed dimensions that are not spacing.
 *
 * `touchTarget` is the minimum hit area for any interactive element — 44pt is
 * the accessibility floor on both platforms.
 */
export const sizes = {
  touchTarget: 44,
} as const;

/** All tokens under one namespace, for callers that prefer `theme.colors.x`. */
export const theme = { colors, spacing, radius, typography, sizes } as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
export type TypographyToken = keyof typeof typography;
export type SizeToken = keyof typeof sizes;
export type Theme = typeof theme;
