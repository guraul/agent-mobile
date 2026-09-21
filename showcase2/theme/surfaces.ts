/**
 * Surface tokens — SHOWCASE2_VISUAL_SPEC.md §5
 * Elevation via three lightness steps + hairline borders, never shadows.
 * Surfaces carry a faint violet tint (not gray) for the atmosphere pass.
 */
import { colors } from './colors';
import { radii } from './spacing';

export const surfaces = {
  // Flat, static grouping (Suggested, static surfaces)
  surface: {
    backgroundColor: colors.surface,
    borderRadius: radii.radiusCard,
  },
  // Interactive / attention-bearing (Needs-You items, composer)
  surfaceElevated: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.radiusCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Full-screen raised layer (Talk, sheet bodies)
  backgroundElevated: {
    backgroundColor: colors.backgroundElevated,
  },
  // Composer pill
  composer: {
    backgroundColor: colors.surfaceElevatedDeep,
    borderRadius: radii.radiusComposer,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radii.radiusChip,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
} as const;

/** Shared vertical ambient gradient for full-screen surfaces (Pulse / Talk). */
export const backgroundGradient = {
  colors: [colors.bgTop, colors.bgMid, colors.bgBottom] as const,
  locations: [0, 0.3, 1] as const,
  start: { x: 0.5, y: 0 } as const,
  end: { x: 0.5, y: 1 } as const,
};
