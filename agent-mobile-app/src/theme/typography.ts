import { Platform, type TextStyle } from "react-native";

export const typography = {
  font: {
    sans: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
    mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },

  display: {
    fontFamily: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
    fontSize: 28,
    fontWeight: "600" as const,
    lineHeight: 28 * 1.15,
    letterSpacing: -0.5,
  },
  headline: {
    fontFamily: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
    fontSize: 22,
    fontWeight: "600" as const,
    lineHeight: 22 * 1.2,
    letterSpacing: -0.3,
  },
  title: {
    fontFamily: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
    fontSize: 17,
    fontWeight: "600" as const,
    lineHeight: 17 * 1.3,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 16 * 1.5,
    letterSpacing: 0,
  },
  bodyStrong: {
    fontFamily: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
    fontSize: 16,
    fontWeight: "500" as const,
    lineHeight: 16 * 1.5,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 13 * 1.4,
    letterSpacing: 0.1,
  },
  captionStrong: {
    fontFamily: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
    fontSize: 13,
    fontWeight: "500" as const,
    lineHeight: 13 * 1.4,
    letterSpacing: 0.1,
  },
  button: {
    fontFamily: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
    fontSize: 15,
    fontWeight: "500" as const,
    lineHeight: 15 * 1.2,
    letterSpacing: 0,
  },
  monoBody: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 14 * 1.6,
    letterSpacing: 0,
  },
  monoCaption: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 12 * 1.5,
    letterSpacing: 0,
  },
} as const;

export type TypographyToken = keyof typeof typography;
export type TextStyleToken = Pick<
  typeof typography,
  | "display"
  | "headline"
  | "title"
  | "body"
  | "bodyStrong"
  | "caption"
  | "captionStrong"
  | "button"
  | "monoBody"
  | "monoCaption"
>;

export type TypographyStyle = TextStyle;
