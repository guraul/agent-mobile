/**
 * Color tokens — source of truth: SHOWCASE2_VISUAL_SPEC.md §2
 * Single violet accent family + restrained semantics. No cyan/magenta/neon.
 * Visual polish: near-black base with a faint violet cast, violet-tinted
 * surfaces and hairlines — depth + atmosphere, not decoration.
 */
export const colors = {
  background: '#0B0A12',
  backgroundElevated: '#14101F',
  surface: '#171428',
  surfaceElevated: '#221E38',
  surfaceElevatedDeep: '#1B1830',
  surfacePressed: '#2A2540',

  border: 'rgba(167,139,250,0.22)',
  borderSubtle: 'rgba(167,139,250,0.12)',

  textPrimary: '#F5F3FA',
  textSecondary: '#A9A3C2',
  textSecondaryBright: '#B4AECB',
  textMuted: '#7A7494',
  textLabel: '#857FA3',

  accent: '#8B5CF6',
  accentBright: '#A78BFA',
  accentDeep: '#6D3EF0',
  accentSoft: 'rgba(139,92,246,0.14)',
  accentBorder: 'rgba(139,92,246,0.32)',

  attention: '#F2B33D',
  noticed: '#6B7BB8',
  success: '#3DC98A',
  warning: '#E8A13C',
  danger: '#E5484D',
  offline: '#55536B',

  scrim: 'rgba(0,0,0,0.5)',

  // Background vertical gradient (restrained violet cast) + top ambient glow.
  bgTop: '#161226',
  bgMid: '#0D0B18',
  bgBottom: '#0B0A12',
  ambientGlow: 'rgba(139,92,246,0.12)',
  ambientGlowSoft: 'rgba(139,92,246,0.06)',

  // Orb glow halo.
  glowHalo: 'rgba(139,92,246,0.28)',
  glowHaloStrong: 'rgba(139,92,246,0.45)',
} as const;
