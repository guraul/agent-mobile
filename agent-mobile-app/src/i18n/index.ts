import { useSyncExternalStore } from "react";

/**
 * 轻量 i18n（第 0 期建能力；第 1 期迁移 Pulse / Settings / Attention / 各 sheet；
 * 第 2 期迁移 chat / chatcode 面板）。
 *
 * - 不引第三方依赖：类型化字典 + `t()` 就是全部。
 * - 默认语言 `en`（当前 UI 的实际语言）；`zh` 保留现有中文文案。
 * - 只放界面文案：assignment 标题、记忆正文、项目名、用户数据一律不进字典。
 * - key 命名：`<surface>.<component>.<key>`，例如 `pulse.digest.allClear`。
 */
export type Locale = "en" | "zh";

const en = {
  // ── 全局：Alert 按钮与跨屏共用的失败文案 ────────────────────────────────
  "app.common.cancel": "Cancel",
  "app.common.sessionGoneTitle": "That conversation is gone",
  "app.common.sessionGoneBody":
    "The conversation this item points to no longer exists. My runtime may have restarted.",
  "app.common.sessionGoneAction": "Open Talk instead",
  "app.common.cannotOpenTalk": "Can't open Talk",

  // ── 全局：Alert 兜底按钮 ───────────────────────────────────────────────
  "alert.feedback.acknowledge": "OK",

  // ── Sheet 原语 ─────────────────────────────────────────────────────────
  "sheet.common.close": "Close sheet",

  // ── Pulse：Header ──────────────────────────────────────────────────────
  "pulse.header.settings": "Settings",
  "pulse.header.presenceOffline": "Offline",
  "pulse.header.presenceNeedsYou": "Needs you",
  "pulse.header.presenceAttentive": "Attentive",

  // ── Pulse：首页 ────────────────────────────────────────────────────────
  "pulse.home.greetingMorning": "Good morning",
  "pulse.home.greetingAfternoon": "Good afternoon",
  "pulse.home.greetingEvening": "Good evening",
  "pulse.home.greetingAlone": "{greeting}.",
  "pulse.home.greetingWithName": "{greeting}, {name}.",
  "pulse.home.offlineVoice": "I'm having trouble reaching my runtime.",
  "pulse.home.seeAll": "See All",
  "pulse.home.more": "More ({n})",
  "pulse.home.moreTitle": "More",
  "pulse.home.emptyVoice": "All's been calm while you were away.",
  "pulse.home.startChat": "Start New Chat",

  // ── Pulse：今日摘要（第 0 期 key，复用）────────────────────────────────
  "pulse.digest.allClear": "Nothing needs you right now.",

  // ── Pulse：Settings sheet ──────────────────────────────────────────────
  "pulse.settings.caption": "Connection, what I remember, and what I'm looking after.",
  "pulse.settings.responsibilities": "RESPONSIBILITIES",
  "pulse.settings.responsibilitiesRow": "What I am responsible for",
  "pulse.settings.responsibilitiesDetail": "Active / completed / revoked",
  "pulse.settings.responsibilitiesLoading": "Loading…",
  "pulse.settings.responsibilitiesEmpty": "Nothing running in the background right now",
  "pulse.settings.responsibilitiesError": "Couldn't load this right now",
  "pulse.settings.responsibilityActive": "Active",
  "pulse.settings.responsibilityProposed": "Proposed",
  "pulse.settings.responsibilityLastRun": "Last run {time}",
  "pulse.settings.lastRunJustNow": "just now",
  "pulse.settings.lastRunMinutes": "{n} min ago",
  "pulse.settings.lastRunHours": "{n} h ago",
  "pulse.settings.responsibilityOpen": "Open {responsibility}",
  "pulse.settings.activityRow": "What I've been doing",
  "pulse.settings.activityDetail": "Last 7 days · read-only",
  "pulse.settings.connection": "CONNECTION",
  "pulse.settings.online": "Online",
  "pulse.settings.offline": "Offline",
  "pulse.settings.account": "Account",
  "pulse.settings.notSignedIn": "Not signed in",
  "pulse.settings.signIn": "Sign in",
  "pulse.settings.signOut": "Sign out",
  "pulse.settings.advancedA11y": "Advanced connection settings",
  "pulse.settings.advanced": "Advanced · BFF address",
  "pulse.settings.defaultSuffix": " (default)",
  "pulse.settings.save": "Save",
  "pulse.settings.reset": "Reset to default",
  "pulse.settings.savedHint": "Takes effect after a restart (refresh on web).",
  "pulse.settings.preferences": "PREFERENCES",
  "pulse.settings.modelPreferenceFor": "Model preference for {agent}",
  "pulse.settings.whatIKnow": "WHAT I KNOW",
  "pulse.settings.memoryDetail": "Memory about you and your projects",
  "pulse.settings.knowledgeRow": "Knowledge sources",
  "pulse.settings.knowledgeDetail": "Search what I can draw on",
  "pulse.settings.modelPickerTitle": "Choose a model for {agent}",
  "pulse.settings.modelSearchPlaceholder": "Search models…",
  "pulse.settings.confirm": "Confirm",
  "pulse.settings.boundariesRow": "How we work together",
  "pulse.settings.boundariesDetail": "What I do on my own · what I ask first · what I never do",
  "pulse.settings.external": "EXTERNAL SOURCES",
  "pulse.settings.calendarRow": "Calendar",
  "pulse.settings.calendarNone": "Not connected",
  "pulse.settings.calendarUnavailable": "Couldn't load right now",
  "pulse.settings.calendarConnected": "{count} calendars connected",
  "pulse.settings.calendarConnected_one": "1 calendar connected",
  "pulse.settings.calendarConnected_other": "{count} calendars connected",

  // ── Pulse：How we work together（自主边界 sheet；内容源在
  //    services/agency/boundaries.ts，改边界时两处一起改）─────────────────
  "pulse.boundaries.title": "How we work together",
  "pulse.boundaries.caption": "The boundaries I actually run on right now.",
  "pulse.boundaries.acts.label": "Acts, then tells you",
  "pulse.boundaries.acts.caption": "No prompt from you. The result lands where you already look.",
  "pulse.boundaries.acts.nightlyRetry.title": "Nightly retry",
  "pulse.boundaries.acts.nightlyRetry.detail":
    "Failed scheduled tasks are retried at 06:00. What came back, or didn't, shows up in Pulse.",
  "pulse.boundaries.acts.nightlyRetry.a11y": "Nightly retry",
  "pulse.boundaries.acts.nightlyRetry.checking": "Checking…",
  "pulse.boundaries.acts.nightlyRetry.statusFailed": "Couldn't read the current setting.",
  "pulse.boundaries.acts.nightlyRetry.toggleFailedTitle": "Couldn't change Nightly retry",
  "pulse.boundaries.acts.nightlyRetry.toggleFailedBody": "Nothing changed. Try again in a moment.",
  "pulse.boundaries.acts.dailyDigest.title": "Daily digest",
  "pulse.boundaries.acts.dailyDigest.detail":
    "One line at the top of Pulse: what I checked for you today. Tap it for the full log.",
  "pulse.boundaries.asks.label": "Asks first",
  "pulse.boundaries.asks.caption": "I prepare the action; the trigger stays with you.",
  "pulse.boundaries.asks.newResponsibility.title": "New scheduled responsibility",
  "pulse.boundaries.asks.newResponsibility.detail":
    "It arrives as a proposal. Nothing is scheduled until you confirm the card.",
  "pulse.boundaries.asks.handoff.title": "Handing work to chatcode",
  "pulse.boundaries.asks.handoff.detail":
    "A handoff leaves this app only after you confirm the handoff card.",
  "pulse.boundaries.never.label": "Never",
  "pulse.boundaries.never.caption": "No confirmation unlocks these.",
  "pulse.boundaries.never.funds.title": "Move money",
  "pulse.boundaries.never.funds.detail": "I never place, transfer, or settle funds.",
  "pulse.boundaries.never.outbound.title": "Send messages for you",
  "pulse.boundaries.never.outbound.detail": "No outbound messages in your name.",
  "pulse.boundaries.never.credentials.title": "Change credentials",
  "pulse.boundaries.never.credentials.detail": "I don't create, rotate, or modify your credentials.",
  "pulse.boundaries.footer":
    "Only Nightly retry can be switched here. Everything else comes from one place in the code; ask me in Talk if one should change.",

  // ── Pulse：Memory sheet ────────────────────────────────────────────────
  "pulse.memory.title": "What I remember",
  "pulse.memory.caption":
    "Durable understanding about you and your projects. Forgetting acts on the canonical store.",
  "pulse.memory.loading": "Loading…",
  "pulse.memory.empty":
    "Nothing in memory yet. memx distills durable understanding from conversations.",
  "pulse.memory.forgetTitle": "Forget this memory?",
  "pulse.memory.forgetBody":
    "{title}\n\nProject memories move to .trash and leave the index; user memories are marked deprecated.",
  "pulse.memory.forget": "Forget",
  "pulse.memory.forgetFailed": "Couldn't forget this memory",
  "pulse.memory.forgetA11y": "Forget {title}",
  "pulse.memory.source": "Source: {source}",

  // ── Pulse：Calendar sheet（ICS 只读订阅，issue #153 切片 3b）─────────────
  "pulse.calendar.title": "Calendar",
  "pulse.calendar.caption":
    "Read-only .ics subscriptions. The link is the credential, so I only ever show a masked version.",
  "pulse.calendar.loading": "Loading…",
  "pulse.calendar.empty": "No calendar connected yet.",
  "pulse.calendar.signInRequired": "Sign in first — calendars are tied to your account.",
  "pulse.calendar.addPlaceholder": "https://…/calendar.ics",
  "pulse.calendar.add": "Add",
  "pulse.calendar.invalidHttps": "Use an https:// link to an .ics feed.",
  "pulse.calendar.invalidIcs": "That link doesn't look like an .ics feed.",
  "pulse.calendar.addFailedLine": "Couldn't add this calendar: {detail}",
  "pulse.calendar.deleteTitle": "Remove this calendar?",
  "pulse.calendar.deleteBody": "{label}\n\nCached events are removed with it.",
  "pulse.calendar.delete": "Remove",
  "pulse.calendar.deleteA11y": "Remove {label}",
  "pulse.calendar.deleteFailedLine": "Couldn't remove this calendar: {detail}",

  // ── Pulse：Knowledge sheet ─────────────────────────────────────────────
  "pulse.knowledge.title": "Knowledge",
  "pulse.knowledge.caption":
    "Sources I can draw on. Search, read, or bring one into a conversation.",
  "pulse.knowledge.backToSearch": "Back to search",
  "pulse.knowledge.open": "Open",
  "pulse.knowledge.askAboutThis": "Ask about this",
  "pulse.knowledge.searchPlaceholder": "Search sources…",
  "pulse.knowledge.search": "Search",
  "pulse.knowledge.unconfigured": "Knowledge vault is not configured (LLM_WIKI_VAULT).",
  "pulse.knowledge.empty": "No matches.",

  // ── Pulse：Market sheet（FundSheet）────────────────────────────────────
  "pulse.market.title": "Market",
  "pulse.market.caption": "Estimates I am keeping an eye on. Informational only.",
  "pulse.market.prev": "prev {nav}",
  "pulse.market.quotesA11y": "Fund market quotes",

  // ── Pulse：In motion 绿卡（SupportingList）──────────────────────────────
  "pulse.supporting.title": "In motion",
  "pulse.supporting.groupReview": "To review",
  "pulse.supporting.groupSuggested": "Suggested",
  "pulse.supporting.groupRunning": "Running",
  "pulse.supporting.groupMarket": "Market",
  "pulse.supporting.review": "Review",
  "pulse.supporting.confirm": "Confirm",
  "pulse.supporting.dismiss": "Dismiss",
  "pulse.supporting.watching": "Watching",
  "pulse.supporting.running": "Running",
  "pulse.supporting.idle": "Idle",

  // ── Pulse：market 同类合并组（#140）──────────────────────────────────
  // base key 供 t(key, { count }) 的类型回退，与 `_other` 同文案
  "pulse.marketGroup.title": "{count} funds crossed the targets you set.",
  "pulse.marketGroup.title_one": "1 fund crossed the targets you set.",
  "pulse.marketGroup.title_other": "{count} funds crossed the targets you set.",
  "pulse.marketGroup.subtitle": "Today's check — kept together.",
  "pulse.marketGroup.expand": "Show {count} details",
  "pulse.marketGroup.collapse": "Hide details",
  "pulse.marketGroup.more": "+{count} more",
  "pulse.marketGroup.a11y": "Review {count} market alerts from today's check",

  // ── Pulse：Featured 卡 ────────────────────────────────────────────────
  "pulse.featured.reviewA11y": "Review: {title}",

  // ── Pulse：domain 标签（Featured / Noticed 的来源）──────────────────────
  "pulse.domain.market": "Market",
  "pulse.domain.coding": "Coding",
  "pulse.domain.pulse": "Pulse",

  // ── Pulse：Noticed（首页分组 / 列表 sheet / 详情 sheet）────────────────
  "pulse.noticed.title": "Noticed",
  "pulse.noticed.discuss": "Discuss",

  // ── Pulse：Activity sheet（Lately）─────────────────────────────────────
  "pulse.activity.title": "Lately",
  "pulse.activity.caption":
    "Read-only record of what I did under your authority. Looking changes nothing.",
  "pulse.activity.today": "Today",
  "pulse.activity.loading": "Loading…",
  "pulse.activity.loadError": "Couldn't load this right now",
  "pulse.activity.retry": "Try again",
  "pulse.activity.emptyToday": "Nothing needed doing today",

  // ── Attention：详情屏 ──────────────────────────────────────────────────
  "attention.detail.back": "Back",
  "attention.detail.refresh": "Refresh",
  "attention.detail.loading": "Loading…",
  "attention.detail.relatedResponsibility": "Related responsibility",
  "attention.detail.state": "State",
  "attention.detail.evidence": "Evidence",
  "attention.detail.noEvidence": "No supporting events.",
  "attention.detail.attempt": "attempt {n}",
  "attention.detail.note": "Viewing never changes state.",
  "attention.detail.renewSent":
    "QR code sent to WeCom. Scan it to renew; I'll remind you again if it's not scanned in 10 minutes.",
  "attention.detail.retryNoAssignment": "This attention has no retryable responsibility",
  "attention.detail.retryFailed": "Retry failed (attempt {n}): {error}",
  "attention.detail.renewed": "Resent",
  "attention.detail.renewing": "Sending…",
  "attention.detail.renew": "Resend QR code",
  "attention.detail.openTalk": "Open Talk",
  "attention.detail.retrying": "Retrying…",
  "attention.detail.retry": "Retry",
  "attention.detail.dismissing": "Dismissing…",
  "attention.detail.dismiss": "Dismiss",
  "attention.detail.dismissTitle": "Dismiss this item?",
  "attention.detail.dismissBody": "This only steps back from the item. The responsibility stays.",

  // ── Attention：Talk 会话解析（services/attention/talk.ts）───────────────
  "attention.talk.sessionTitle": "Handling: {title}",
  "attention.talk.sessionGone": "The conversation for this item is no longer available",

  // ── Assignment：详情屏 ─────────────────────────────────────────────────
  "assignment.detail.revokeBody":
    "Stops future runs; existing reminders stay as they are (PM §11).\n\n{responsibility}",
  "assignment.detail.revoke": "Revoke",

  // ── Chat：通用 ─────────────────────────────────────────────────────────
  "chat.common.loading": "Loading…",
  "chat.common.retry": "Retry",

  // ── Chat：面板（状态行 / Attention 上下文卡 / 排队条）──────────────────
  "chat.panel.loadingMessages": "Loading messages…",
  "chat.panel.running": "Running…",
  "chat.panel.stopped": "Stopped",
  "chat.panel.handling": "Handling: {title}",
  "chat.panel.markHandled": "Mark handled",
  "chat.panel.markingHandled": "Marking…",
  "chat.panel.alreadyHandledTitle": "Already handled",
  "chat.panel.alreadyHandledBody": "This item is no longer open.",
  "chat.panel.markFailedTitle": "Couldn't mark as handled",
  "chat.queue.edit": "Edit queued message",
  "chat.queue.moveUp": "Move queued message up",
  "chat.queue.remove": "Remove queued message",

  // ── Chat：输入区 ───────────────────────────────────────────────────────
  "chat.composer.placeholder": "Ask anything…",
  "chat.composer.placeholderMessage": "Message Pulse…",
  "chat.composer.expand": "Expand composer",
  "chat.composer.attachmentTitle": "Attachments",
  "chat.composer.attachmentBody": "Attachments are coming soon.",
  "chat.composer.attachmentA11y": "Add attachment",
  "chat.composer.voiceTitle": "Voice input",
  "chat.composer.voiceBody": "Voice input is coming soon.",
  "chat.composer.send": "Send",
  "chat.composer.stop": "Stop",
  "chat.composer.selectModel": "Select model",
  "chat.composer.switchAgent": "Switch agent",

  // ── Chat：model / agent 选择 sheet ─────────────────────────────────────
  "chat.picker.modelTitle": "Choose a model",
  "chat.picker.agentTitle": "Choose an agent",

  // ── Chat：question sheet ───────────────────────────────────────────────
  "chat.question.stepOf": "Question {n}/{total}",
  "chat.question.customPlaceholder": "Type your own answer (optional)",
  "chat.question.next": "Next",
  "chat.question.submit": "Submit",
  "chat.question.skip": "Skip this question",

  // ── Chat：permission sheet ─────────────────────────────────────────────
  "chat.permission.title": "Permission request",
  "chat.permission.askRun": "The agent wants to run {action}.",
  "chat.permission.askExternalDirectory": "The agent wants to access a directory outside this project.",
  "chat.permission.allowOnce": "Allow once",
  "chat.permission.alwaysAllow": "Always allow",
  "chat.permission.reject": "Reject",

  // ── Chat：工具输出 / 工具组 / 思考卡 ───────────────────────────────────
  "chat.tools.outputTitle": "Tool output",
  "chat.tools.outputTitleWithTool": "Tool output · {tool}",
  "chat.tools.outputEmpty": "No output.",
  "chat.tools.groupLabel": "Tool calls",
  // base key 是缺少 count 时的回退（类型要求存在），与 `_other` 同文案
  "chat.tools.badge": "{count} calls",
  "chat.tools.badge_one": "{count} call",
  "chat.tools.badge_other": "{count} calls",
  "chat.tools.groupA11y": "Tool calls ({n})",
  "chat.tools.viewOutput": "View {tool} output",
  "chat.tools.truncated": "… truncated ({n} lines total)",
  "chat.tools.running": "Running {tool}…",
  "chat.tools.runningMany": "Running {n} tools…",
  "chat.think.label": "Thinking",
  "chat.think.a11y": "Reasoning",
  "chat.think.pending": "Thinking…",

  // ── Chat：消息气泡 ─────────────────────────────────────────────────────
  "chat.message.copy": "Copy message",
  "chat.message.errorLabel": "Something went wrong",

  // ── Chat：移交卡（HandoffCard）─────────────────────────────────────────
  "chat.handoff.title": "Hand off to workbench",
  "chat.handoff.bodyPlaceholder": "Goal, boundaries, where it should land",
  "chat.handoff.bodyA11y": "Handoff details",
  "chat.handoff.edit": "Edit",
  "chat.handoff.editDone": "Done",
  "chat.handoff.target": "Target",
  "chat.handoff.modeNew": "New project",
  "chat.handoff.modeExisting": "Existing project",
  "chat.handoff.pathA11y": "Project path",
  "chat.handoff.namePlaceholder": "Name (optional, used as the session title)",
  "chat.handoff.nameA11y": "Session title",
  "chat.handoff.projectsFailed": "Couldn't load projects",
  "chat.handoff.projectsRetryA11y": "Reload projects",
  "chat.handoff.projectsLoading": "Loading projects…",
  "chat.handoff.projectsEmpty": "No usable project directories yet. Pick New project to enter one.",
  "chat.handoff.failed": "Handoff failed: {message}",
  "chat.handoff.submitting": "Handing off…",
  "chat.handoff.dismiss": "Not now",

  // ── Chat：定时任务确认卡（AssignmentConfirmCard）────────────────────────
  "chat.assignment.title": "Scheduled task",
  "chat.assignment.condition": "When: {condition}",
  "chat.assignment.failed": "Couldn't create it: {message}",
  "chat.assignment.confirm": "Confirm",
  "chat.assignment.creating": "Creating…",
  "chat.assignment.supplement": "Adjust",
  "chat.assignment.supplementA11y": "Describe the change",
  "chat.assignment.supplementPlaceholder": "What should change?",
  "chat.assignment.send": "Send",

  // ── Chat：Sessions 抽屉 ────────────────────────────────────────────────
  "chat.sessions.title": "Sessions",
  "chat.sessions.close": "Close sessions",
  "chat.sessions.empty": "No sessions yet",
  "chat.sessions.new": "New session",
  "chat.sessions.justNow": "just now",
  "chat.sessions.minutesAgo": "{n} min ago",
  "chat.sessions.hoursAgo": "{n} h ago",

  // ── Chat：外壳（ProjectChatZ / talk）───────────────────────────────────
  "chat.shell.titleChat": "Pulse — Chat",
  "chat.shell.titleCode": "Pulse — Code Chat",
  "chat.shell.backToPulse": "Back to Pulse",
  "chat.shell.backToProjects": "Back to projects",
  "chat.shell.switchSession": "Switch session",
  "chat.shell.closeSession": "Close session",
  "chat.shell.empty": "No session yet for this project.",
  "chat.shell.emptyHint": "Start a new conversation.",
  "chat.shell.sessionGoneBody":
    "That conversation is gone (my runtime may have restarted). Switched to the most recent one.",

  // ── Service 拼句：Assignment 投影（projection.ts）────────────────────────
  "assignment.projection.observationReason":
    "Based on recent market observations (NAV fell across 3 consecutive checkpoints)",
  "assignment.projection.effect":
    "Once confirmed: runs automatically {trigger} and {action}; you can revoke it anytime from Responsibilities.",
  "assignment.projection.action.always": "reminds you at the scheduled time",
  "assignment.projection.action.condition": "reminds you when the condition is met",

  // ── Service 拼句：定时任务确认卡（assignment-card）───────────────────────
  "assignment.card.schedule.daily": "Every day at {time}",
  "assignment.card.schedule.tradingDay": "Every trading day at {time}",
  "assignment.card.schedule.weekend": "Every weekend at {time}",
  "assignment.card.mode.oneShot": "One-time",
  "assignment.card.mode.ongoing": "Ongoing",
  "assignment.card.domain.market": "Market",
  "assignment.card.domain.personal": "Personal",
  "assignment.card.condition.target": "Fund {fundCode} reaches its target NAV",
  "assignment.card.condition.above": "Fund {fundCode} above {value}",
  "assignment.card.condition.below": "Fund {fundCode} below {value}",
  "assignment.card.createFailed": "Couldn't create it",
  "assignment.card.note.createdWithId": "Created · {id}",
  "assignment.card.note.created": "Created",
  "assignment.card.note.duplicate": "Same rule already exists",
  "assignment.card.note.superseded": "Updated — see the new card below",
  "assignment.card.receipt.createdWithId": 'Set up "{name}" (Assignment: {id})',
  "assignment.card.receipt.created": 'Set up "{name}"',
  "assignment.card.proposalPending": "Proposal {proposalId} submitted, waiting for activation",

  // ── Service 拼句：移交卡（handoff）──────────────────────────────────────
  "handoff.card.errorFallback": "Handoff failed",
  "handoff.card.note.done": "Handed off — opening the workbench",
  "handoff.card.note.dismissed": "Cancelled — your chat is still here",
  "handoff.card.note.superseded": "Updated — see the new card below",

  // ── Service 拼句：移交目标目录校验 ──────────────────────────────────────
  "handoff.target.empty": "Enter a target directory",
  "handoff.target.notAbsolute": "Use an absolute path starting with /",
  "handoff.target.traversal": "Paths can't contain ..",
  "handoff.target.tooLong": "Path can't be longer than {max} characters",
  "handoff.target.forbidden": "That directory can't open the workbench. Pick another project directory.",

  // ── Service 拼句：命令回执 / runtime 兜底 ───────────────────────────────
  "command.failed": "Command failed: {raw}",
  "runtime.auth.title": "Sign in first",
  "runtime.auth.body": "Your session expired. Sign in again and retry.",
  "runtime.other.title": "Something went wrong",
  "runtime.other.body": "The request didn't go through. Try again in a moment.",

  // ── Service 拼句：assignment 斜杠命令反馈 ───────────────────────────────
  "assignment.command.invalidTime": "Invalid time {at}",
  "assignment.command.stateUnknown": "unknown",
  "assignment.command.fund.responsibilityTarget":
    "Every trading day at {at}, watch fund {fundCode} for its estimated NAV reaching the target; remind me when it triggers",
  "assignment.command.fund.responsibilityAbove":
    "Every trading day at {at}, watch fund {fundCode} for going above {value}; remind me when it triggers",
  "assignment.command.fund.responsibilityBelow":
    "Every trading day at {at}, watch fund {fundCode} for going below {value}; remind me when it triggers",
  "assignment.command.remind.responsibility": "Remind me at {at}: {text}",
  "assignment.command.fund.duplicate":
    "A similar monitor is already active ({duplicateOf}). To replace it, run /revoke {duplicateOf} first. This proposal was not created: {proposalId}",
  "assignment.command.fund.activated": "✓ Activated (low risk, activated directly)\nAssignment: {id}\n{responsibility}",
  "assignment.command.fund.proposed":
    "Proposal created (waiting for your confirmation — market monitoring is an ongoing responsibility)\nProposal: {id}\n{responsibility}\n\nReply /confirm {id} to activate, or /reject {id} to discard.",
  "assignment.command.remind.activated": "✓ Reminder set (low risk, activated directly)\n{responsibility}",
  "assignment.command.remind.proposed": "Reminder proposal created: {id}\nReply /confirm {id} to activate.",
  "assignment.command.confirm.activated": "✓ Proposal confirmed, assignment activated: {id}\n{responsibility}",
  "assignment.command.confirm.pending": "Proposal {id} confirmed (no activation result returned).",
  "assignment.command.reject": "Proposal rejected: {id}. No assignment was created and nothing will trigger.",
  "assignment.command.revoke.done": "✓ Revoked: {id}\nFuture triggers stopped; existing reminders stay as they are.",
  "assignment.command.revoke.notActive": "This assignment is no longer active (currently: {state}) — nothing to revoke.",
  "assignment.command.repair.failed":
    "Retry failed again (attempt {attempt}): {error}\nYou can /repair {id} again later.",
  "assignment.command.repair.done": "✓ Retry succeeded (attempt {attempt}) — responsibility fulfilled.",
  "assignment.command.compensate.skipRevoked":
    "✓ One-time responsibility dropped (revoked) — it won't run or catch up.",
  "assignment.command.compensate.skipped": "Skip recorded (assignment state: {state}).",
  "assignment.command.compensate.failed":
    "Catch-up run still failed (attempt {attempt}): {error}\nYou can /repair {id} again later.",
  "assignment.command.compensate.done": "✓ Catch-up run done (attempt {attempt}) — responsibility fulfilled.",
  "assignment.command.list.empty": "No active assignments.",
  "assignment.command.list.header": "Active assignments ({count}):",
  "assignment.command.list.pending":
    "compensation pending (missed {at}) — /run-now {id} to run now, or /skip {id} to drop",
} as const;

type PluralSuffix = "_one" | "_other";
type PluralBase<K> = K extends `${infer Base}${PluralSuffix}` ? Base : never;

/** 字典的 key 集合。复数 key（`_one` / `_other`）同时暴露其基名，便于 `t(key, { count })`。 */
export type MessageKey = keyof typeof en | PluralBase<keyof typeof en>;

/** `zh` 必须实现 `en` 的全部 key —— 缺一条即编译失败。 */
type MessageDict = Record<MessageKey, string>;

const zh = {
  "app.common.cancel": "取消",
  "app.common.sessionGoneTitle": "原会话已不存在",
  "app.common.sessionGoneBody": "该事项引用的会话已丢失（agent runtime 可能重启过）。",
  "app.common.sessionGoneAction": "去 Talk 默认会话",
  "app.common.cannotOpenTalk": "无法进入 Talk",

  "alert.feedback.acknowledge": "知道了",

  "sheet.common.close": "关闭面板",

  "pulse.header.settings": "设置",
  "pulse.header.presenceOffline": "离线",
  "pulse.header.presenceNeedsYou": "需要你",
  "pulse.header.presenceAttentive": "留意中",

  "pulse.home.greetingMorning": "早上好",
  "pulse.home.greetingAfternoon": "下午好",
  "pulse.home.greetingEvening": "晚上好",
  "pulse.home.greetingAlone": "{greeting}。",
  "pulse.home.greetingWithName": "{greeting}，{name}。",
  "pulse.home.offlineVoice": "我暂时连不上我的 runtime。",
  "pulse.home.seeAll": "查看全部",
  "pulse.home.more": "更多（{n}）",
  "pulse.home.moreTitle": "更多",
  "pulse.home.emptyVoice": "你不在的时候，一切都很平静。",
  "pulse.home.startChat": "开始新对话",

  "pulse.digest.allClear": "现在没有需要你处理的事。",

  "pulse.settings.caption": "连接、我记得的事，以及我正在盯着的事。",
  "pulse.settings.responsibilities": "职责",
  "pulse.settings.responsibilitiesRow": "我负责的事",
  "pulse.settings.responsibilitiesDetail": "生效中 / 已完成 / 已撤销",
  "pulse.settings.responsibilitiesLoading": "加载中…",
  "pulse.settings.responsibilitiesEmpty": "现在后台没有在跑的事",
  "pulse.settings.responsibilitiesError": "暂时读不到",
  "pulse.settings.responsibilityActive": "生效中",
  "pulse.settings.responsibilityProposed": "待确认",
  "pulse.settings.responsibilityLastRun": "上次执行 {time}",
  "pulse.settings.lastRunJustNow": "刚刚",
  "pulse.settings.lastRunMinutes": "{n} 分钟前",
  "pulse.settings.lastRunHours": "{n} 小时前",
  "pulse.settings.responsibilityOpen": "打开 {responsibility}",
  "pulse.settings.activityRow": "我最近在做什么",
  "pulse.settings.activityDetail": "最近 7 天 · 只读",
  "pulse.settings.connection": "连接",
  "pulse.settings.online": "在线",
  "pulse.settings.offline": "离线",
  "pulse.settings.account": "账号",
  "pulse.settings.notSignedIn": "未登录",
  "pulse.settings.signIn": "去登录",
  "pulse.settings.signOut": "登出",
  "pulse.settings.advancedA11y": "高级连接设置",
  "pulse.settings.advanced": "高级 · BFF 地址",
  "pulse.settings.defaultSuffix": "（默认）",
  "pulse.settings.save": "保存",
  "pulse.settings.reset": "恢复默认",
  "pulse.settings.savedHint": "保存后重启生效（web 刷新即可）",
  "pulse.settings.preferences": "偏好",
  "pulse.settings.modelPreferenceFor": "{agent} 的 model 偏好",
  "pulse.settings.whatIKnow": "我知道什么",
  "pulse.settings.memoryDetail": "关于你和你的项目的记忆",
  "pulse.settings.knowledgeRow": "知识来源",
  "pulse.settings.knowledgeDetail": "搜索我可以引用的资料",
  "pulse.settings.modelPickerTitle": "为 {agent} 选择 model",
  "pulse.settings.modelSearchPlaceholder": "搜索 model…",
  "pulse.settings.confirm": "确认",
  "pulse.settings.boundariesRow": "我们怎么一起工作",
  "pulse.settings.boundariesDetail": "我自己会做的 · 我要先问的 · 我绝不做的",
  "pulse.settings.external": "外部来源",
  "pulse.settings.calendarRow": "日历",
  "pulse.settings.calendarNone": "未连接",
  "pulse.settings.calendarUnavailable": "暂时读不到",
  "pulse.settings.calendarConnected": "已连 {count} 个日历",
  "pulse.settings.calendarConnected_one": "已连 1 个日历",
  "pulse.settings.calendarConnected_other": "已连 {count} 个日历",

  "pulse.boundaries.title": "我们怎么一起工作",
  "pulse.boundaries.caption": "我现在实际按这套边界在做事。",
  "pulse.boundaries.acts.label": "先做后报",
  "pulse.boundaries.acts.caption": "不用你开口；结果落在你本来就会看的地方。",
  "pulse.boundaries.acts.nightlyRetry.title": "夜间补跑",
  "pulse.boundaries.acts.nightlyRetry.detail":
    "失败的定时任务会在 06:00 重跑一次。补回来没有，都能在 Pulse 看到。",
  "pulse.boundaries.acts.nightlyRetry.a11y": "夜间补跑",
  "pulse.boundaries.acts.nightlyRetry.checking": "读取中…",
  "pulse.boundaries.acts.nightlyRetry.statusFailed": "读取当前设置失败。",
  "pulse.boundaries.acts.nightlyRetry.toggleFailedTitle": "夜间补跑没能改过来",
  "pulse.boundaries.acts.nightlyRetry.toggleFailedBody": "设置没有变化，请稍后再试。",
  "pulse.boundaries.acts.dailyDigest.title": "每日摘要",
  "pulse.boundaries.acts.dailyDigest.detail":
    "Pulse 顶部一句话：今天替你查了什么。点开是完整记录。",
  "pulse.boundaries.asks.label": "先问再做",
  "pulse.boundaries.asks.caption": "我准备好动作，扳机留在你手上。",
  "pulse.boundaries.asks.newResponsibility.title": "新建定时责任",
  "pulse.boundaries.asks.newResponsibility.detail":
    "先作为提案出现。你在卡上确认之前，什么都不会被排进定时表。",
  "pulse.boundaries.asks.handoff.title": "把工作移交给 chatcode",
  "pulse.boundaries.asks.handoff.detail": "只有你确认移交卡之后，工作才会离开这个应用。",
  "pulse.boundaries.never.label": "绝不做",
  "pulse.boundaries.never.caption": "确认也解锁不了这些。",
  "pulse.boundaries.never.funds.title": "动资金",
  "pulse.boundaries.never.funds.detail": "不下单、不转账、不做结算。",
  "pulse.boundaries.never.outbound.title": "代发对外消息",
  "pulse.boundaries.never.outbound.detail": "不以你的名义对外发任何消息。",
  "pulse.boundaries.never.credentials.title": "改凭据",
  "pulse.boundaries.never.credentials.detail": "不新建、不轮换、不修改你的凭据。",
  "pulse.boundaries.footer":
    "这里只有夜间补跑可以切换。其余边界只有代码里一处来源；要改，在 Talk 里跟我说。",

  "pulse.memory.title": "我记得什么",
  "pulse.memory.caption": "关于你和你的项目的持久理解。忘记会直接作用于权威存储。",
  "pulse.memory.loading": "加载中…",
  "pulse.memory.empty": "还没有 Memory——memx 会在会话中提炼持久理解。",
  "pulse.memory.forgetTitle": "忘记这条记忆？",
  "pulse.memory.forgetBody":
    "{title}\n\nproject 记忆将移入 .trash 并从索引移除；user 记忆将被标记弃用。",
  "pulse.memory.forget": "忘记",
  "pulse.memory.forgetFailed": "忘记失败",
  "pulse.memory.forgetA11y": "忘记 {title}",
  "pulse.memory.source": "来源：{source}",

  "pulse.calendar.title": "日历",
  "pulse.calendar.caption":
    "只读的 .ics 订阅。链接本身就是凭据，所以这里只显示打码后的地址。",
  "pulse.calendar.loading": "加载中…",
  "pulse.calendar.empty": "还没有连接日历。",
  "pulse.calendar.signInRequired": "请先登录——日历跟随你的账号。",
  "pulse.calendar.addPlaceholder": "https://…/calendar.ics",
  "pulse.calendar.add": "添加",
  "pulse.calendar.invalidHttps": "请填 https:// 开头的 .ics 订阅地址。",
  "pulse.calendar.invalidIcs": "这个地址看起来不是 .ics 订阅。",
  "pulse.calendar.addFailedLine": "添加失败：{detail}",
  "pulse.calendar.deleteTitle": "移除这个日历？",
  "pulse.calendar.deleteBody": "{label}\n\n已缓存的事件会一起删除。",
  "pulse.calendar.delete": "移除",
  "pulse.calendar.deleteA11y": "移除 {label}",
  "pulse.calendar.deleteFailedLine": "移除失败：{detail}",

  "pulse.knowledge.title": "知识",
  "pulse.knowledge.caption": "我可以引用的资料。搜索、阅读，或带进一次对话。",
  "pulse.knowledge.backToSearch": "返回搜索",
  "pulse.knowledge.open": "打开",
  "pulse.knowledge.askAboutThis": "就此提问",
  "pulse.knowledge.searchPlaceholder": "搜索资料…",
  "pulse.knowledge.search": "搜索",
  "pulse.knowledge.unconfigured": "知识库 vault 未配置（LLM_WIKI_VAULT）",
  "pulse.knowledge.empty": "无匹配结果",

  "pulse.market.title": "市场",
  "pulse.market.caption": "我在关注的估算。仅供参考。",
  "pulse.market.prev": "前值 {nav}",
  "pulse.market.quotesA11y": "基金行情",

  "pulse.supporting.title": "进行中",
  "pulse.supporting.groupReview": "待处理",
  "pulse.supporting.groupSuggested": "建议",
  "pulse.supporting.groupRunning": "运行中",
  "pulse.supporting.groupMarket": "市场",
  "pulse.supporting.review": "审阅",
  "pulse.supporting.confirm": "确认",
  "pulse.supporting.dismiss": "忽略",
  "pulse.supporting.watching": "关注中",
  "pulse.supporting.running": "运行中",
  "pulse.supporting.idle": "空闲",

  "pulse.marketGroup.title": "{count} 只基金越过了你设定的目标。",
  "pulse.marketGroup.title_one": "1 只基金越过了你设定的目标。",
  "pulse.marketGroup.title_other": "{count} 只基金越过了你设定的目标。",
  "pulse.marketGroup.subtitle": "今日检查 — 放在一起。",
  "pulse.marketGroup.expand": "展开 {count} 条",
  "pulse.marketGroup.collapse": "收起",
  "pulse.marketGroup.more": "+{count} 条",
  "pulse.marketGroup.a11y": "查看今日检查中的 {count} 条市场提醒",

  "pulse.featured.reviewA11y": "审阅：{title}",

  "pulse.domain.market": "市场",
  "pulse.domain.coding": "编程",
  "pulse.domain.pulse": "Pulse",

  "pulse.noticed.title": "注意到",
  "pulse.noticed.discuss": "讨论",

  "pulse.activity.title": "最近",
  "pulse.activity.caption": "在你授权下我做过什么的只读记录。查看不会改变任何东西。",
  "pulse.activity.today": "今天",
  "pulse.activity.loading": "加载中…",
  "pulse.activity.loadError": "暂时读不到记录",
  "pulse.activity.retry": "重试",
  "pulse.activity.emptyToday": "今天没有需要做的事",

  "attention.detail.back": "返回",
  "attention.detail.refresh": "刷新",
  "attention.detail.loading": "加载中…",
  "attention.detail.relatedResponsibility": "关联的职责",
  "attention.detail.state": "状态",
  "attention.detail.evidence": "依据",
  "attention.detail.noEvidence": "没有可支撑的事件。",
  "attention.detail.attempt": "第 {n} 次尝试",
  "attention.detail.note": "查看不会改变状态。",
  "attention.detail.renewSent": "已发送二维码到企业微信，请扫码续期；10 分钟未扫会再提醒你",
  "attention.detail.retryNoAssignment": "该 Attention 未关联可重试的 responsibility",
  "attention.detail.retryFailed": "重试失败（第 {n} 次）：{error}",
  "attention.detail.renewed": "已重发",
  "attention.detail.renewing": "发送中…",
  "attention.detail.renew": "重发二维码",
  "attention.detail.openTalk": "打开 Talk",
  "attention.detail.retrying": "重试中…",
  "attention.detail.retry": "重试",
  "attention.detail.dismissing": "退出中…",
  "attention.detail.dismiss": "退出",
  "attention.detail.dismissTitle": "退出这条事项？",
  "attention.detail.dismissBody": "仅代表显式退出，不影响 responsibility。",

  "attention.talk.sessionTitle": "处理：{title}",
  "attention.talk.sessionGone": "该事项的会话已不可用",

  "assignment.detail.revokeBody": "停止未来执行；已有提醒保留（PM §11）。\n\n{responsibility}",
  "assignment.detail.revoke": "撤销",

  "chat.common.loading": "加载中…",
  "chat.common.retry": "重试",

  "chat.panel.loadingMessages": "加载消息…",
  "chat.panel.running": "运行中…",
  "chat.panel.stopped": "已停止",
  "chat.panel.handling": "处理中：{title}",
  "chat.panel.markHandled": "标记已处理",
  "chat.panel.markingHandled": "标记中…",
  "chat.panel.alreadyHandledTitle": "已处理过",
  "chat.panel.alreadyHandledBody": "该 Attention 已不在 OPEN 状态。",
  "chat.panel.markFailedTitle": "标记失败",
  "chat.queue.edit": "编辑排队消息",
  "chat.queue.moveUp": "上移排队消息",
  "chat.queue.remove": "删除排队消息",

  "chat.composer.placeholder": "随便问…",
  "chat.composer.placeholderMessage": "给 Pulse 发消息…",
  "chat.composer.expand": "展开输入",
  "chat.composer.attachmentTitle": "附件",
  "chat.composer.attachmentBody": "附件功能即将上线",
  "chat.composer.attachmentA11y": "添加附件",
  "chat.composer.voiceTitle": "语音",
  "chat.composer.voiceBody": "语音输入即将上线",
  "chat.composer.send": "发送",
  "chat.composer.stop": "停止",
  "chat.composer.selectModel": "选择 model",
  "chat.composer.switchAgent": "切换 Agent",

  "chat.picker.modelTitle": "选择模型",
  "chat.picker.agentTitle": "选择 Agent",

  "chat.question.stepOf": "问题 {n}/{total}",
  "chat.question.customPlaceholder": "输入自定义答案（可选）",
  "chat.question.next": "下一步",
  "chat.question.submit": "提交",
  "chat.question.skip": "跳过此问题",

  "chat.permission.title": "权限请求",
  "chat.permission.askRun": "Agent 请求执行 {action}。",
  "chat.permission.askExternalDirectory": "Agent 请求访问外部目录。",
  "chat.permission.allowOnce": "允许一次",
  "chat.permission.alwaysAllow": "始终允许",
  "chat.permission.reject": "拒绝",

  "chat.tools.outputTitle": "工具输出",
  "chat.tools.outputTitleWithTool": "工具输出 · {tool}",
  "chat.tools.outputEmpty": "无输出。",
  "chat.tools.groupLabel": "工具调用",
  "chat.tools.badge": "{count} 项",
  "chat.tools.badge_one": "{count} 项",
  "chat.tools.badge_other": "{count} 项",
  "chat.tools.groupA11y": "工具调用（{n} 项）",
  "chat.tools.viewOutput": "查看 {tool} 输出",
  "chat.tools.truncated": "… 已截断（共 {n} 行）",
  "chat.tools.running": "正在调用 {tool}…",
  "chat.tools.runningMany": "正在调用 {n} 个工具…",
  "chat.think.label": "思考",
  "chat.think.a11y": "思考过程",
  "chat.think.pending": "思考中…",

  "chat.message.copy": "复制消息",
  "chat.message.errorLabel": "出错了",

  "chat.handoff.title": "移交到工作台",
  "chat.handoff.bodyPlaceholder": "要交接的目标、边界、落点",
  "chat.handoff.bodyA11y": "交接内容",
  "chat.handoff.edit": "改一下",
  "chat.handoff.editDone": "好了",
  "chat.handoff.target": "目标",
  "chat.handoff.modeNew": "新建项目",
  "chat.handoff.modeExisting": "既有项目",
  "chat.handoff.pathA11y": "项目路径",
  "chat.handoff.namePlaceholder": "名称（可选，只作会话标题）",
  "chat.handoff.nameA11y": "会话标题",
  "chat.handoff.projectsFailed": "项目列表没读到",
  "chat.handoff.projectsRetryA11y": "重新读取项目",
  "chat.handoff.projectsLoading": "正在读取项目…",
  "chat.handoff.projectsEmpty": "还没有可用的项目目录，用「新建项目」填一个",
  "chat.handoff.failed": "移交失败：{message}",
  "chat.handoff.submitting": "移交中…",
  "chat.handoff.dismiss": "先不要",

  "chat.assignment.title": "定时任务",
  "chat.assignment.condition": "命中条件：{condition}",
  "chat.assignment.failed": "创建失败：{message}",
  "chat.assignment.confirm": "确认",
  "chat.assignment.creating": "创建中…",
  "chat.assignment.supplement": "补充",
  "chat.assignment.supplementA11y": "补充说明",
  "chat.assignment.supplementPlaceholder": "说说要改什么",
  "chat.assignment.send": "发送",

  "chat.sessions.title": "会话",
  "chat.sessions.close": "关闭抽屉",
  "chat.sessions.empty": "暂无会话",
  "chat.sessions.new": "新建会话",
  "chat.sessions.justNow": "刚刚",
  "chat.sessions.minutesAgo": "{n} 分钟前",
  "chat.sessions.hoursAgo": "{n} 小时前",

  "chat.shell.titleChat": "Pulse — Chat",
  "chat.shell.titleCode": "Pulse — Code Chat",
  "chat.shell.backToPulse": "返回 Pulse",
  "chat.shell.backToProjects": "返回项目",
  "chat.shell.switchSession": "切换会话",
  "chat.shell.closeSession": "关闭会话",
  "chat.shell.empty": "这个项目还没有会话。",
  "chat.shell.emptyHint": "开始一次新对话。",
  "chat.shell.sessionGoneBody": "该会话已丢失（agent runtime 可能重启过）。已切换到最近的会话。",

  "assignment.projection.observationReason": "基于近期行情观察（连续 3 个评估点净值走低）",
  "assignment.projection.effect": "确认后：{trigger} 自动评估，{action}；可随时在 Responsibilities 中撤销。",
  "assignment.projection.action.always": "到点提醒你",
  "assignment.projection.action.condition": "命中条件时提醒你",

  "assignment.card.schedule.daily": "每天 {time}",
  "assignment.card.schedule.tradingDay": "每个交易日 {time}",
  "assignment.card.schedule.weekend": "每周末 {time}",
  "assignment.card.mode.oneShot": "一次性",
  "assignment.card.mode.ongoing": "持续",
  "assignment.card.domain.market": "市场",
  "assignment.card.domain.personal": "个人",
  "assignment.card.condition.target": "基金 {fundCode} 达到目标净值",
  "assignment.card.condition.above": "基金 {fundCode} 高于 {value}",
  "assignment.card.condition.below": "基金 {fundCode} 低于 {value}",
  "assignment.card.createFailed": "创建失败",
  "assignment.card.note.createdWithId": "已创建 · {id}",
  "assignment.card.note.created": "已创建",
  "assignment.card.note.duplicate": "已有相同规则",
  "assignment.card.note.superseded": "已更新，请看下面新的卡片",
  "assignment.card.receipt.createdWithId": "已设定 “{name}”（Assignment: {id}）",
  "assignment.card.receipt.created": "已设定 “{name}”",
  "assignment.card.proposalPending": "已提交提案 {proposalId}，等待激活",

  "handoff.card.errorFallback": "移交失败",
  "handoff.card.note.done": "已移交，正在打开工作台",
  "handoff.card.note.dismissed": "已取消，聊天的内容都还在",
  "handoff.card.note.superseded": "已更新，请看下面新的卡片",

  "handoff.target.empty": "填一个目标目录",
  "handoff.target.notAbsolute": "要用绝对路径，以 / 开头",
  "handoff.target.traversal": "路径里不能带 ..",
  "handoff.target.tooLong": "路径不能超过 {max} 个字符",
  "handoff.target.forbidden": "这个目录进不了工作台，换一个项目目录",

  "command.failed": "命令失败：{raw}",
  "runtime.auth.title": "请先登录",
  "runtime.auth.body": "登录已过期，请重新登录后再试。",
  "runtime.other.title": "出了点问题",
  "runtime.other.body": "请求没有成功，请稍后重试。",

  "assignment.command.invalidTime": "无效时间 {at}",
  "assignment.command.stateUnknown": "未知",
  "assignment.command.fund.responsibilityTarget": "每个交易日 {at} 监控基金 {fundCode} 估净是否达到目标净值；命中时提醒我",
  "assignment.command.fund.responsibilityAbove": "每个交易日 {at} 监控基金 {fundCode} 是否高于 {value}；命中时提醒我",
  "assignment.command.fund.responsibilityBelow": "每个交易日 {at} 监控基金 {fundCode} 是否低于 {value}；命中时提醒我",
  "assignment.command.remind.responsibility": "{at} 提醒我：{text}",
  "assignment.command.fund.duplicate":
    "已有正在生效的同类监控（{duplicateOf}）。如需更换，请先 /revoke {duplicateOf}。本次提案未创建：{proposalId}",
  "assignment.command.fund.activated": "✓ 已激活（低风险直接激活）\nAssignment: {id}\n{responsibility}",
  "assignment.command.fund.proposed":
    "已创建提案（等待你的确认——市场监控是持续责任）\nProposal: {id}\n{responsibility}\n\n回复 /confirm {id} 激活，或 /reject {id} 放弃。",
  "assignment.command.remind.activated": "✓ 提醒已设定（低风险直接激活）\n{responsibility}",
  "assignment.command.remind.proposed": "已创建提醒提案：{id}\n回复 /confirm {id} 激活。",
  "assignment.command.confirm.activated": "✓ 提案已确认，Assignment 激活：{id}\n{responsibility}",
  "assignment.command.confirm.pending": "提案 {id} 已确认（激活结果未返回）。",
  "assignment.command.reject": "提案已拒绝：{id}。未创建任何 Assignment，不会产生触发。",
  "assignment.command.revoke.done": "✓ 已撤销：{id}\n未来触发已停止；已有提醒保持不变。",
  "assignment.command.revoke.notActive": "该 Assignment 已不在 active 状态（当前：{state}），无需重复撤销。",
  "assignment.command.repair.failed": "重试仍失败（attempt {attempt}）：{error}\n可稍后再 /repair {id}。",
  "assignment.command.repair.done": "✓ 重试成功（attempt {attempt}）——责任已履行。",
  "assignment.command.compensate.skipRevoked": "✓ 已放弃该一次性责任（revoked）——不再执行，也不会补跑。",
  "assignment.command.compensate.skipped": "已记录跳过决定（Assignment 状态：{state}）。",
  "assignment.command.compensate.failed": "补偿执行仍失败（attempt {attempt}）：{error}\n可稍后再 /repair {id} 重试。",
  "assignment.command.compensate.done": "✓ 已补偿执行（attempt {attempt}）——责任已履行。",
  "assignment.command.list.empty": "当前没有生效中的 Assignment。",
  "assignment.command.list.header": "生效中的 Assignment（{count}）：",
  "assignment.command.list.pending": "⚠️ 补偿待决（{at} 错过）——/run-now {id} 立即执行，或 /skip {id} 放弃",
} satisfies MessageDict;

export type MessageVars = Record<string, string | number>;

const dictionaries: Record<Locale, MessageDict> = { en, zh };

let locale: Locale = "en";

const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return locale;
}

export function setLocale(next: Locale): void {
  if (next === locale) return;
  locale = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 语言订阅 hook：切换语言时触发重渲染。
 * 用 `useSyncExternalStore` 而非 `useEffect` + `setState`：外部 store 的读取发生在渲染期（无
 * 首帧旧值 / 额外一轮渲染），且天然满足 `react-hooks/set-state-in-effect`。
 */
export function useLocale(): [Locale, (next: Locale) => void] {
  const current = useSyncExternalStore(subscribe, getLocale, getLocale);
  return [current, setLocale];
}

const warned = new Set<string>();

function warnMissing(key: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[i18n] missing message key: ${key}`);
}

/**
 * 纯函数翻译引擎（`t` 的内部实现，单独导出便于测试）。
 *
 * - `{name}` 占位符用 `vars.name` 插值；未提供的占位符原样保留。
 * - `vars.count` 为 number 时优先取 `${key}_one`（count === 1）/ `${key}_other`，找不到回落到 `key`。
 * - 缺 key：返回 key 本身并回调 `onMissing`，绝不抛异常。
 */
export function translate(
  dict: Readonly<Record<string, string>>,
  key: string,
  vars?: MessageVars,
  onMissing?: (key: string) => void,
): string {
  const count = vars?.count;
  let template: string | undefined;
  if (typeof count === "number") {
    template = dict[`${key}_${count === 1 ? "one" : "other"}`];
  }
  template ??= dict[key];

  if (template === undefined) {
    onMissing?.(key);
    return key;
  }

  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = vars[name];
    return value === undefined ? placeholder : String(value);
  });
}

/** 当前语言下取文案；缺 key 返回 key 本身并 warn 一次（同一 key 不重复刷屏）。 */
export function t(key: MessageKey, vars?: MessageVars): string {
  return translate(dictionaries[locale], key, vars, warnMissing);
}
