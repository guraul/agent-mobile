export const colors = {
  canvas: "#0c0a09",
  surface: {
    1: "#141211",
    2: "#1c1917",
    3: "#24211e",
  },
  inverse: "#f5f4f2",

  ink: "#f5f4f2",
  body: "#cbc9c6",
  muted: "#8a8884",
  disabled: "#5c5a57",
  onAccent: "#1a1410",
  onInverse: "#1a1410",
  onSurface3: "#f5f4f2",

  accent: {
    default: "#f5a624",
    bright: "#ffb84d",
    pressed: "#d18d1e",
    focus: "rgba(245, 166, 36, 0.4)",
    subtle: "rgba(245, 166, 36, 0.12)",
  },

  status: {
    running: "#f5a624",
    idle: "#8a8884",
    success: "#5db872",
    error: "#c75c4c",
    warning: "#ffb84d",
    fill: {
      running: "rgba(245, 166, 36, 0.15)",
      idle: "rgba(138, 136, 132, 0.15)",
      success: "rgba(93, 184, 114, 0.15)",
      error: "rgba(199, 92, 76, 0.15)",
      warning: "rgba(255, 184, 77, 0.15)",
    },
    border: {
      success: "rgba(93, 184, 114, 0.3)",
      error: "rgba(199, 92, 76, 0.3)",
      warning: "rgba(255, 184, 77, 0.3)",
      running: "rgba(245, 166, 36, 0.3)",
      idle: "rgba(138, 136, 132, 0.3)",
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
    default: "rgba(255, 255, 255, 0.08)",
    strong: "rgba(255, 255, 255, 0.16)",
    focused: "rgba(245, 166, 36, 0.4)",
    error: "rgba(199, 92, 76, 0.5)",
    disabled: "rgba(255, 255, 255, 0.04)",
  },

  scrim: "rgba(0, 0, 0, 0.5)",
} as const;

export type Colors = typeof colors;
