import { Redirect } from "expo-router";

/**
 * Legacy route compatibility: /memory no longer exists as a top-level tab.
 * Memory is a contextual capability (Settings → What I remember).
 * Redirect keeps old deep links / bookmarks from 404-ing.
 */
export default function MemoryRedirect() {
  return <Redirect href="/" />;
}
