/**
 * Typography tokens — SHOWCASE2_VISUAL_SPEC.md §3
 * System font stack (fontFamily unset) + tabular-nums on every numeric metadata.
 * Uppercase only for `label` and `caption` styles.
 */
import { Platform, TextStyle } from 'react-native';

export const fontFamilies = {
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
} as const;

type FontVariant = NonNullable<TextStyle['fontVariant']>;

const metadata: TextStyle = {
  fontSize: 12,
  lineHeight: 16,
  fontWeight: '400',
  letterSpacing: 0.2,
  fontVariant: ['tabular-nums'] as FontVariant,
};

export const type: Record<string, TextStyle> = {
  hero: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  display: {
    fontSize: 33,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subheading: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
  },
  bodySmall: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  metadata,
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  mono: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    fontFamily: fontFamilies.mono,
  },
};
