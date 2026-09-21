import { Redirect } from "expo-router";

/**
 * Legacy route compatibility: /me no longer exists as a top-level tab.
 * Me content lives in the Settings sheet (Pulse header → Settings).
 * Redirect keeps old deep links / bookmarks from 404-ing.
 */
export default function MeRedirect() {
  return <Redirect href="/" />;
}
