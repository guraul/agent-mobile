// 模拟 mergeMessages 对真实消息的处理
import { mergeMessages } from './src/services/message-merging.ts';

// 模拟 API 返回（newest-first），取最近 8 条
const raw = [
  // newest first
  { info: { id: 'm8', role: 'assistant', time: { created: 1008 } }, parts: [{ type: 'text', text: '现在我理解了完整图景' }] },
  { info: { id: 'm7', role: 'user', time: { created: 1007 } }, parts: [{ type: 'text', text: '现在session消息的顺序有问题' }] },
  { info: { id: 'm6', role: 'assistant', time: { created: 1006 } }, parts: [{ type: 'text', text: '全部修复完成并验证修复内容' }] },
  { info: { id: 'm5', role: 'assistant', time: { created: 1005 } }, parts: [{ type: 'text', text: '打开弹出框后' }] }, // 这是 user? 不
  { info: { id: 'm4', role: 'user', time: { created: 1004 } }, parts: [{ type: 'text', text: '打开弹出框后，一开始正常' }] },
  { info: { id: 'm3', role: 'assistant', time: { created: 1003 } }, parts: [{ type: 'text', text: '全部问题已修复并验证修复内容' }] },
  { info: { id: 'm2', role: 'user', time: { created: 1002 } }, parts: [{ type: 'text', text: '现在pulse页面交互没有问题' }] },
  { info: { id: 'm1', role: 'assistant', time: { created: 1001 } }, parts: [{ type: 'text', text: '这是最早' }] },
];
// ChatPanel 里：raw 是 newest-first，recomputeDisplay 先 reverse 成 chronological
const chronological = [...raw].reverse();
const display = mergeMessages(chronological);
console.log('merge 后显示顺序:');
display.forEach((m, i) => console.log(`  [${i}] ${m.role}: ${m.text.slice(0, 30)}`));
