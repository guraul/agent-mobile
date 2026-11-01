import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { lightColors } from "../../theme/light";
import { PressableScale } from "./PressableScale";
import { getBaseUrl } from "../../config/opencode";
import { loadToken, tokenHeader } from "../../services/auth";
import { t, useLocale } from "../../i18n";

/**
 * ContinueThreads —— 续接标记（PRODUCT_MODEL §24）。
 *
 * 只做一件事：把「上次没聊完的话题」摆到首页，点一下**恢复原会话**（不新建对话）。
 * 数据来自 `GET /api/product/open-threads`（用户令牌）；最多显示 3 条，其余忽略——
 * 首页不是列表页，话题多时她会在对话里列（`thread_list`）。
 * 失败静默（不显示区块），绝不阻塞首页其它内容。
 */

interface OpenThread {
  id: string;
  sessionId: string;
  reason: string;
  createdAt: number;
}

const MAX_ROWS = 3;

export function ContinueThreads() {
  useLocale();
  const router = useRouter();
  const [threads, setThreads] = useState<OpenThread[]>([]);

  const load = useCallback(() => {
    loadToken()
      .then(() => {
        const headers = tokenHeader();
        if (!headers.Authorization) return null;
        return fetch(`${getBaseUrl()}/api/product/open-threads`, {
          headers: { ...headers, Accept: "application/json" },
        });
      })
      .then((res) => {
        if (!res || !res.ok) return null;
        return res.json();
      })
      .then((body) => {
        const items = (body as { threads?: OpenThread[] } | null)?.threads;
        if (Array.isArray(items)) setThreads(items.slice(0, MAX_ROWS));
      })
      .catch(() => {
        // 静默：拿不到就不显示这一块
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (threads.length === 0) return null;

  return (
    <View style={styles.card} testID="continue-threads">
      <View style={styles.head}>
        <View style={styles.dot} />
        <View style={styles.headText}>
          <Text style={styles.title} testID="continue-threads-title">
            {t("pulse.continue.title")}
          </Text>
        </View>
      </View>
      {threads.map((thread, index) => (
        <PressableScale
          key={thread.id}
          testID={`continue-thread-${index}`}
          style={[styles.row, index > 0 ? styles.rowDivider : null]}
          scaleTo={0.99}
          onPress={() => router.push({ pathname: "/talk", params: { sessionId: thread.sessionId } })}
        >
          <Text style={styles.reason} numberOfLines={2}>
            {thread.reason}
          </Text>
          <Text style={styles.action}>{t("pulse.continue.action")}</Text>
        </PressableScale>
      ))}
    </View>
  );
}

// 视觉与 PulseNoticed 同级（ghost 卡），但它是「可继续的线索」，不是 informational。
const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: lightColors.accentBorder,
    borderRadius: 14,
    backgroundColor: lightColors.white,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    paddingBottom: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: lightColors.accent },
  headText: { flex: 1 },
  title: {
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: lightColors.groupLabel,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingVertical: 8,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: lightColors.rowGray },
  reason: { flex: 1, fontSize: 14, lineHeight: 20, color: lightColors.bodyText },
  action: { fontSize: 13, color: lightColors.accentDeep },
});
