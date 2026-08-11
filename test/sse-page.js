const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  await page.goto('http://127.0.0.1:9928/pulse', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  const evt = await page.evaluate(async () => {
    const auth = 'Basic ' + btoa('opencode:f14dd6828c5bcd6bd35d14be281c3e79802b002ddabd2bd7');
    const res = await fetch('http://127.0.0.1:4096/global/event', { headers: { Authorization: auth, Accept: 'text/event-stream' } });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    const types = [];
    const sessIds = new Set();
    const loop = async () => {
      const { done, value } = await reader.read();
      if (done) return;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data:')) {
            try {
              const raw = JSON.parse(line.slice(5).trim());
              const p = raw.payload ?? raw;
              if (p.type !== 'server.connected' && p.type !== 'heartbeat' && p.type !== 'sync') {
                types.push(p.type);
                if (p.properties?.sessionID) sessIds.add(p.properties.sessionID);
                if (p.properties?.info?.sessionID) sessIds.add(p.properties.info.sessionID);
              }
            } catch {}
          }
        }
      }
      if (types.length > 6) return;
      await loop();
    };
    loop();
    return new Promise((resolve) => {
      setTimeout(() => resolve({ types, sessIds: [...sessIds] }), 12000);
    });
  });
  console.log('in-page SSE events:', JSON.stringify(evt));
  await browser.close();
})();
