export const opencodeConfig = {
  baseUrl:
    process.env.EXPO_PUBLIC_OPENCODE_URL ??
    "http://106.13.181.13:19234",
  runtimeBaseUrl: null as string | null,
  token: "",
};

/** 运行时覆盖优先(启动时从 AsyncStorage 读),否则回退 env 默认 */
export function getBaseUrl(): string {
  return opencodeConfig.runtimeBaseUrl ?? opencodeConfig.baseUrl;
}
