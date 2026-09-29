import { describe, expect, it } from "vitest";
import {
  dequeueFirst,
  enqueueMessage,
  moveQueuedUp,
  removeQueued,
  type QueuedMessage,
} from "./message-queue";

const q = (id: string, text: string): QueuedMessage => ({ id, text, createdAt: 1000 });

describe("enqueueMessage", () => {
  it("追加到队尾，不修改原数组", () => {
    const base = [q("a", "first")];
    const next = enqueueMessage(base, "second", "b", 2000);
    expect(next).toEqual([
      { id: "a", text: "first", createdAt: 1000 },
      { id: "b", text: "second", createdAt: 2000 },
    ]);
    expect(base).toEqual([q("a", "first")]);
  });

  it("空队列入队", () => {
    expect(enqueueMessage([], "hello", "x", 1000)).toEqual([q("x", "hello")]);
  });
});

describe("dequeueFirst", () => {
  it("空队列返回 null 与原数组", () => {
    const { next, rest } = dequeueFirst([]);
    expect(next).toBeNull();
    expect(rest).toEqual([]);
  });

  it("出队首条，rest 为剩余队列（FIFO）", () => {
    const { next, rest } = dequeueFirst([q("a", "1"), q("b", "2")]);
    expect(next).toEqual(q("a", "1"));
    expect(rest).toEqual([q("b", "2")]);
  });
});

describe("removeQueued", () => {
  it("按 id 删除，保持其余顺序", () => {
    expect(removeQueued([q("a", "1"), q("b", "2"), q("c", "3")], "b")).toEqual([
      q("a", "1"),
      q("c", "3"),
    ]);
  });

  it("id 不存在时内容不变", () => {
    expect(removeQueued([q("a", "1")], "zz")).toEqual([q("a", "1")]);
  });
});

describe("moveQueuedUp", () => {
  it("与前一条交换位置", () => {
    expect(moveQueuedUp([q("a", "1"), q("b", "2"), q("c", "3")], "b").map((x) => x.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("已在队首时原样返回（同一引用，无动作）", () => {
    const base = [q("a", "1"), q("b", "2")];
    expect(moveQueuedUp(base, "a")).toBe(base);
  });

  it("id 不存在时原样返回", () => {
    const base = [q("a", "1")];
    expect(moveQueuedUp(base, "zz")).toBe(base);
  });
});
