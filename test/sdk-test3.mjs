import { createOpencodeClient } from '/root/project/agent-mobile/agent-mobile-app/node_modules/@opencode-ai/sdk/dist/index.js';
const sdk = createOpencodeClient({
  baseUrl: 'http://127.0.0.1:4096',
  headers: () => ({ Authorization: 'Basic ' + Buffer.from('opencode:f14dd6828c5bcd6bd35d14be281c3e79802b002ddabd2bd7').toString('base64') }),
});
sdk.event.subscribe({
  onSseEvent: (ev) => {
    const d = ev.data;
    try { const j = JSON.parse(d); console.log('EVENT:', j.type, JSON.stringify(j.properties)?.slice(0,80)); }
    catch { console.log('RAW:', String(d).slice(0,100)); }
  },
  onSseError: (e) => console.log('SSE ERROR:', String(e).slice(0,120)),
}).then(() => console.log('subscribed ok'));
const r = await sdk.session.list({ directory: '/root/project/agent-mobile' });
const list = r.data ?? (Array.isArray(r) ? r : []);
console.log('total:', list.length, 'first:', list[0]?.title, list[0]?.id);
const sid = list[0].id;
await sdk.session.prompt_async({ sessionID: sid, body: { parts: [{ type: 'text', text: 'ping3' }] } });
console.log('prompt sent, waiting 18s...');
await new Promise(r => setTimeout(r, 18000));
process.exit(0);
