import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ModelPref } from "./filter-models";

const KEY = (agent: string) => `pulse_model_pref_${agent}`;

export async function getModelPref(agent: string): Promise<ModelPref | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY(agent));
    return raw ? (JSON.parse(raw) as ModelPref) : null;
  } catch { return null; }
}

export async function setModelPref(agent: string, pref: ModelPref): Promise<void> {
  try { await AsyncStorage.setItem(KEY(agent), JSON.stringify(pref)); } catch {}
}

export async function loadModelPrefs(): Promise<Record<string, ModelPref>> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const out: Record<string, ModelPref> = {};
    for (const k of keys) {
      if (!k.startsWith("pulse_model_pref_")) continue;
      const raw = await AsyncStorage.getItem(k);
      if (raw) {
        const agent = k.slice("pulse_model_pref_".length);
        out[agent] = JSON.parse(raw) as ModelPref;
      }
    }
    return out;
  } catch { return {}; }
}
