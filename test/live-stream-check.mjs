// Live integration check: subscribe to /global/event SSE, send a prompt via prompt_async,
// and verify message.* events arrive for the target session.
const PW = process.env.PW;
const BASE = "http://127.0.0.1:4096";
const auth = "Basic " + Buffer.from(`opencode:${PW}`).toString("base64");

async function main() {
  // find a session for agent-mobile
  const sessions = await (await fetch(`${BASE}/session?directory=${encodeURIComponent("/root/project/agent-mobile")}`, { headers: { Authorization: auth } })).json();
  if (!sessions.length) throw new Error("no session found");
  const sessionID = sessions[0].id;
  console.log("session:", sessionID, "title:", sessions[0].title);

  // subscribe to SSE
  const res = await fetch(`${BASE}/global/event`, { headers: { Authorization: auth, Accept: "text/event-stream" } });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawMessageUpdated = false;
  let sawPartUpdated = false;
  const start = Date.now();

  // send a message async
  await fetch(`${BASE}/session/${sessionID}/prompt_async`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ parts: [{ type: "text", text: "reply with the single word: pong" }] }),
  });
  console.log("sent prompt_async");

  while (Date.now() - start < 30000) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const data = chunk.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("\n");
      if (!data) continue;
      try {
        const raw = JSON.parse(data);
        const payload = raw.payload ?? raw;
        if (payload.type === "sync") continue;
        const props = payload.properties || {};
        if (props.sessionID === sessionID) {
          if (payload.type === "message.updated") sawMessageUpdated = true;
          if (payload.type === "message.part.updated") sawPartUpdated = true;
          if (payload.type === "session.idle") { console.log("session idle reached"); break; }
        }
      } catch {}
    }
  }
  console.log("sawMessageUpdated:", sawMessageUpdated, "sawPartUpdated:", sawPartUpdated);
  reader.cancel();
  process.exit(0);
}
main().catch((e) => { console.error("ERR", e); process.exit(1); });
