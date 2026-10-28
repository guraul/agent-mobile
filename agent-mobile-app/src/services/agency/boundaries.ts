import type { MessageKey } from "../../i18n";

/**
 * 自主边界（agency boundaries）——Settings「How we work together」的唯一事实源。
 *
 * ⚠️ 边界变更必须同步此文件：任何一层行为的增删改（新增自动补跑场景、放开某个
 * 「先问」动作、取消某条「绝不做」），都先改这里与对应 i18n key，再改实现。
 * UI 只渲染这份列表、不复制内容，否则界面上的承诺会和实际行为分叉。
 *
 * 三层 = 授权从宽到严：先做后报 → 先问再做 → 绝不做。
 * 只读：没有开关、没有写接口，也没有按账号/环境切换的分支。
 */
export type BoundaryTierId = "actsThenTells" | "asksFirst" | "never";

export interface BoundaryItemSpec {
  /** 稳定 id（testID 与将来的审计对账用），不参与文案。 */
  id: string;
  titleKey: MessageKey;
  detailKey: MessageKey;
}

export interface BoundaryTierSpec {
  id: BoundaryTierId;
  /** 复用 StatusType 的色调，不新造状态色。 */
  tone: "running" | "warning" | "idle";
  labelKey: MessageKey;
  captionKey: MessageKey;
  items: readonly BoundaryItemSpec[];
}

/** 顺序即展示顺序，短句描述「当前实际生效」的行为，不写规划中的能力。 */
export const BOUNDARY_TIERS: readonly BoundaryTierSpec[] = [
  {
    id: "actsThenTells",
    tone: "running",
    labelKey: "pulse.boundaries.acts.label",
    captionKey: "pulse.boundaries.acts.caption",
    items: [
      {
        id: "nightly-retry",
        titleKey: "pulse.boundaries.acts.nightlyRetry.title",
        detailKey: "pulse.boundaries.acts.nightlyRetry.detail",
      },
      {
        id: "daily-digest",
        titleKey: "pulse.boundaries.acts.dailyDigest.title",
        detailKey: "pulse.boundaries.acts.dailyDigest.detail",
      },
    ],
  },
  {
    id: "asksFirst",
    tone: "warning",
    labelKey: "pulse.boundaries.asks.label",
    captionKey: "pulse.boundaries.asks.caption",
    items: [
      {
        id: "new-responsibility",
        titleKey: "pulse.boundaries.asks.newResponsibility.title",
        detailKey: "pulse.boundaries.asks.newResponsibility.detail",
      },
      {
        id: "handoff-to-chatcode",
        titleKey: "pulse.boundaries.asks.handoff.title",
        detailKey: "pulse.boundaries.asks.handoff.detail",
      },
    ],
  },
  {
    id: "never",
    tone: "idle",
    labelKey: "pulse.boundaries.never.label",
    captionKey: "pulse.boundaries.never.caption",
    items: [
      {
        id: "move-money",
        titleKey: "pulse.boundaries.never.funds.title",
        detailKey: "pulse.boundaries.never.funds.detail",
      },
      {
        id: "send-messages",
        titleKey: "pulse.boundaries.never.outbound.title",
        detailKey: "pulse.boundaries.never.outbound.detail",
      },
      {
        id: "change-credentials",
        titleKey: "pulse.boundaries.never.credentials.title",
        detailKey: "pulse.boundaries.never.credentials.detail",
      },
    ],
  },
];
