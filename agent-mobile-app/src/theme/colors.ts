export const colors = {
  canvas: "#0B0A10",
  surface: {
    1: "#15141D",
    2: "#1B1A26",
    3: "#221F2E",
  },
  inverse: "#F4F3F8",

  ink: "#F4F3F8",
  body: "#A9A6BB",
  muted: "#6F6C82",
  disabled: "#55536B",
  onAccent: "#FFFFFF",
  onInverse: "#12101A",
  onSurface3: "#F4F3F8",

  accent: {
    default: "#8B5CF6",
    bright: "#A78BFA",
    pressed: "#6D3EF0",
    focus: "rgba(139, 92, 246, 0.4)",
    subtle: "rgba(139, 92, 246, 0.14)",
  },
  accentBorder: "rgba(139, 92, 246, 0.32)",

  status: {
    running: "#F2B33D",
    idle: "#6F6C82",
    success: "#3DC98A",
    error: "#E5484D",
    warning: "#E8A13C",
    fill: {
      running: "rgba(242, 179, 61, 0.15)",
      idle: "rgba(111, 108, 130, 0.15)",
      success: "rgba(61, 201, 138, 0.15)",
      error: "rgba(229, 72, 77, 0.15)",
      warning: "rgba(232, 161, 60, 0.15)",
    },
    border: {
      success: "rgba(61, 201, 138, 0.3)",
      error: "rgba(229, 72, 77, 0.3)",
      warning: "rgba(232, 161, 60, 0.3)",
      running: "rgba(242, 179, 61, 0.3)",
      idle: "rgba(111, 108, 130, 0.3)",
    },
  },

  agent: {
    opencode: "#7c8aa0",
    claude: "#a08272",
    codex: "#7a9a92",
    fill: {
      opencode: "rgba(124, 138, 160, 0.15)",
      claude: "rgba(160, 130, 114, 0.15)",
      codex: "rgba(122, 154, 146, 0.15)",
    },
  },

  border: {
    default: "rgba(255, 255, 255, 0.10)",
    subtle: "rgba(255, 255, 255, 0.055)",
    strong: "rgba(255, 255, 255, 0.16)",
    focused: "rgba(139, 92, 246, 0.4)",
    error: "rgba(229, 72, 77, 0.5)",
    disabled: "rgba(255, 255, 255, 0.04)",
  },

  scrim: "rgba(0, 0, 0, 0.5)",
} as const;

export type Colors = typeof colors;
