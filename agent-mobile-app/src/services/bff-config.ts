import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "pulse_bff_url";

export async function getRuntimeBaseUrl(): Promise<string | null> {
  try { return await AsyncStorage.getItem(KEY); } catch { return null; }
}

export async function setRuntimeBaseUrl(url: string): Promise<void> {
  try { await AsyncStorage.setItem(KEY, url); } catch {}
}

export async function clearRuntimeBaseUrl(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}
