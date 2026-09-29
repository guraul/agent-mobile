// 排队消息队列（epic #35 / #33，数据层 = 客户端纯函数队列）：
// session busy（沿用现有 sending 状态——prompt_async 在整个 agent 运行期间挂起）
// 时发送的消息进队列，气泡流上方显示排队 chip（可删除/可上移/点文本回填编辑）；
// busy 结束自动依次发送。
// 红线：纯函数、零 RN 依赖、可单测；不得覆盖流式 part（轮询冲突教训——队列只
// 在 sending 翻转 false 后逐条发送，走 sendMessageAsync 正常链路，不碰 messages 数组）。

export interface QueuedMessage {
  id: string;
  text: string;
  createdAt: number;
}

/** 入队（追加到队尾；文本应已 trim，由调用方保证） */
export function enqueueMessage(
  queue: QueuedMessage[],
  text: string,
  id: string,
  now: number = Date.now(),
): QueuedMessage[] {
  return [...queue, { id, text, createdAt: now }];
}

/** 出队首条：空队列返回 null；调用方拿 next 发送、rest 回写状态 */
export function dequeueFirst(
  queue: QueuedMessage[],
): { next: QueuedMessage | null; rest: QueuedMessage[] } {
  if (queue.length === 0) return { next: null, rest: queue };
  return { next: queue[0], rest: queue.slice(1) };
}

/** 删除指定条（id 不存在时原样返回内容相等的新数组） */
export function removeQueued(queue: QueuedMessage[], id: string): QueuedMessage[] {
  return queue.filter((q) => q.id !== id);
}

/** 上移一位（与前一条交换；已在队首时返回原数组——无可移动对象） */
export function moveQueuedUp(queue: QueuedMessage[], id: string): QueuedMessage[] {
  const idx = queue.findIndex((q) => q.id === id);
  if (idx <= 0) return queue;
  const next = [...queue];
  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
  return next;
}
