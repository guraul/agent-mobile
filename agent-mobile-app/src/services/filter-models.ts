export interface ModelPref {
  providerID: string;
  modelID: string;
}

/** 按 modelID/providerID 子串不分大小写过滤,空 query 返回全量 */
export function filterModels(list: ModelPref[], query: string): ModelPref[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (m) =>
      m.modelID.toLowerCase().includes(q) ||
      m.providerID.toLowerCase().includes(q),
  );
}
