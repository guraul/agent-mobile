export const opencodeConfig = {
  baseUrl:
    process.env.EXPO_PUBLIC_OPENCODE_URL ??
    "http://127.0.0.1:4096",
  username: process.env.EXPO_PUBLIC_OPENCODE_USERNAME ?? "opencode",
  password: process.env.EXPO_PUBLIC_OPENCODE_PASSWORD ?? "",
};
