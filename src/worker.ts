import { connect } from "cloudflare:sockets";

interface Env { DC_STORE: KVNamespace; }

const HTML: string = "<!DOCTYPE html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"UTF-8\"/>\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>\n<title>TG DC Monitor</title>\n<link href=\"https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap\" rel=\"stylesheet\"/>\n<style>\n*{box-sizing:border-box;margin:0;padding:0}\n:root{\n  --bg:#080b10;--s1:#0d1117;--s2:#161d27;--s3:#1e2736;\n  --b1:rgba(255,255,255,0.06);--b2:rgba(255,255,255,0.1);\n  --blue:#3b9eff;--green:#3dffa0;--red:#ff4560;--yellow:#ffc53d;--purple:#b48cff;\n  --t1:#e2eaf5;--t2:#8899b0;--t3:#506070;\n  --mono:'JetBrains Mono',monospace;\n}\nhtml,body{min-height:100%;background:var(--bg);color:var(--t1);font-family:var(--mono);font-size:13px}\nbody{background-image:radial-gradient(ellipse 60% 30% at 50% 0%,rgba(59,158,255,0.06),transparent)}\n\n.wrap{max-width:680px;margin:0 auto;padding:32px 16px 64px}\n\n/* Header */\n.hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px}\n.hdr-left{display:flex;align-items:center;gap:12px}\n.hdr-dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 8px var(--green);animation:glow 2s infinite}\n@keyframes glow{0%,100%{opacity:1}50%{opacity:.4}}\n.hdr-title{font-size:15px;font-weight:700;letter-spacing:-.3px;color:var(--t1)}\n.hdr-sub{font-size:11px;color:var(--t3);margin-top:2px}\n.hdr-timer{font-size:11px;color:var(--t3);text-align:right}\n.hdr-timer span{color:var(--blue);font-weight:500}\n\n/* Summary */\n.sumbar{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px}\n.sumcard{background:var(--s1);border:1px solid var(--b1);border-radius:10px;padding:12px 14px}\n.sumcard__label{font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px}\n.sumcard__val{font-size:20px;font-weight:700;color:var(--t1)}\n.sumcard__val--ok{color:var(--green)}\n.sumcard__val--warn{color:var(--yellow)}\n.sumcard__val--bad{color:var(--red)}\n\n/* DC grid */\n.grid{display:flex;flex-direction:column;gap:6px}\n\n/* DC row */\n.row{display:grid;grid-template-columns:80px 1fr 90px 36px;align-items:center;gap:12px;\n  background:var(--s1);border:1px solid var(--b1);border-radius:10px;padding:10px 14px;\n  transition:background .15s,border-color .15s;cursor:default}\n.row:hover{background:var(--s2);border-color:var(--b2)}\n.row--off{border-color:rgba(255,69,96,.15);background:rgba(255,69,96,.03)}\n.row--off:hover{background:rgba(255,69,96,.05)}\n\n.row__name{display:flex;flex-direction:column;gap:3px}\n.row__id{font-size:13px;font-weight:700;color:var(--t1)}\n.row__badges{display:flex;gap:4px}\n.badge{font-size:9px;font-weight:700;letter-spacing:.6px;padding:1px 5px;border-radius:3px}\n.badge--main{background:rgba(59,158,255,.12);color:var(--blue)}\n.badge--media{background:rgba(180,140,255,.12);color:var(--purple)}\n.badge--cdn{background:rgba(255,197,61,.12);color:var(--yellow)}\n\n.row__info{display:flex;flex-direction:column;gap:4px;min-width:0}\n.row__loc{font-size:11px;color:var(--t3);display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.row__ip{font-size:10px;color:var(--t3)}\n.row__bar-wrap{height:2px;background:var(--s3);border-radius:2px;overflow:hidden}\n.row__bar{height:100%;border-radius:2px;transition:width .5s ease}\n\n.row__lat{text-align:right}\n.lat-num{font-size:18px;font-weight:700;line-height:1}\n.lat-unit{font-size:10px;color:var(--t3);margin-left:1px}\n.lat-na{font-size:16px;color:var(--t3)}\n\n.row__status{display:flex;justify-content:center}\n.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}\n.dot--on{background:var(--green);box-shadow:0 0 6px var(--green)}\n.dot--off{background:var(--red)}\n\n/* Group headers */\n.group-hdr{font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.8px;\n  padding:12px 2px 6px;border-bottom:1px solid var(--b1);margin-bottom:6px}\n\n/* Skeleton */\n.sk{background:var(--s2);border-radius:4px;animation:shim 1.2s infinite}\n@keyframes shim{0%,100%{opacity:.3}50%{opacity:.6}}\n\n/* Error */\n.err{background:rgba(255,69,96,.08);border:1px solid rgba(255,69,96,.2);\n  border-radius:10px;padding:12px 16px;color:var(--red);margin-bottom:16px;font-size:12px}\n\n/* History sparkline */\n.row__spark{display:none}\n@media(min-width:500px){\n  .row{grid-template-columns:80px 1fr 120px 90px 36px}\n  .row__spark{display:block}\n}\n</style>\n</head>\n<body>\n<div class=\"wrap\">\n  <div class=\"hdr\">\n    <div class=\"hdr-left\">\n      <div class=\"hdr-dot\" id=\"hdr-dot\"></div>\n      <div>\n        <div class=\"hdr-title\">Telegram DC Monitor</div>\n        <div class=\"hdr-sub\">TCP \u00b7 \u0432\u0441\u0435 \u0441\u0435\u0440\u0432\u0435\u0440\u044b \u0432 \u0440\u0435\u0430\u043b\u044c\u043d\u043e\u043c \u0432\u0440\u0435\u043c\u0435\u043d\u0438</div>\n      </div>\n    </div>\n    <div class=\"hdr-timer\">\u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0435 \u0447\u0435\u0440\u0435\u0437<br><span id=\"countdown\">\u2014</span></div>\n  </div>\n\n  <div class=\"sumbar\" id=\"sumbar\">\n    <div class=\"sumcard\"><div class=\"sumcard__label\">\u0412\u0441\u0435\u0433\u043e DC</div><div class=\"sumcard__val sk\" style=\"width:40px;height:24px\"></div></div>\n    <div class=\"sumcard\"><div class=\"sumcard__label\">\u041e\u043d\u043b\u0430\u0439\u043d</div><div class=\"sumcard__val sk\" style=\"width:32px;height:24px\"></div></div>\n    <div class=\"sumcard\"><div class=\"sumcard__label\">Avg latency</div><div class=\"sumcard__val sk\" style=\"width:56px;height:24px\"></div></div>\n  </div>\n\n  <div id=\"err\" style=\"display:none\" class=\"err\"></div>\n  <div class=\"grid\" id=\"grid\"></div>\n</div>\n\n<script>\nconst W = \"https://tg-dc-monitor.aerostovtsev.workers.dev\";\nconst INTERVAL = 60;\n\nlet data = null, histCache = {}, countdown = INTERVAL, initialLoad = true;\n\nfunction latColor(ms) {\n  if (!ms) return null;\n  return ms < 80 ? \"#3dffa0\" : ms < 200 ? \"#ffc53d\" : \"#ff4560\";\n}\n\nfunction sparkSvg(pts, w=90, h=20) {\n  if (!pts || pts.length < 2) return '<div style=\"width:'+w+'px;height:'+h+'px\"></div>';\n  const BW=3,GAP=1, max = Math.floor(w/(BW+GAP));\n  const vis = pts.slice(-max);\n  const maxL = Math.max(...vis.filter(p=>p.latency).map(p=>p.latency), 1);\n  const bars = vis.map((p,i) => {\n    const bh = p.online && p.latency ? Math.max(2, Math.round(p.latency/maxL*(h-2))) : 2;\n    const c = !p.online ? \"#ff4560\" : p.latency<80 ? \"#3dffa0\" : p.latency<200 ? \"#ffc53d\" : \"#ff9040\";\n    return `<rect x=\"${i*(BW+GAP)}\" y=\"${h-bh}\" width=\"${BW}\" height=\"${bh}\" rx=\"1\" fill=\"${c}\" opacity=\".8\"/>`;\n  }).join(\"\");\n  return `<svg width=\"${w}\" height=\"${h}\" style=\"display:block\">${bars}</svg>`;\n}\n\nfunction renderSummary(d) {\n  const {total,online,avgLatency} = d.summary;\n  const vc = online===total?\"--ok\":online===0?\"--bad\":\"--warn\";\n  document.getElementById(\"sumbar\").innerHTML = `\n    <div class=\"sumcard\"><div class=\"sumcard__label\">\u0412\u0441\u0435\u0433\u043e DC</div><div class=\"sumcard__val\">${total}</div></div>\n    <div class=\"sumcard\"><div class=\"sumcard__label\">\u041e\u043d\u043b\u0430\u0439\u043d</div><div class=\"sumcard__val sumcard__val${vc}\">${online}/${total}</div></div>\n    <div class=\"sumcard\"><div class=\"sumcard__label\">Avg latency</div><div class=\"sumcard__val\">${avgLatency}<span style=\"font-size:11px;color:var(--t3)\">ms</span></div></div>`;\n  const dot = document.getElementById(\"hdr-dot\");\n  dot.style.background = online===total?\"var(--green)\":online===0?\"var(--red)\":\"var(--yellow)\";\n  dot.style.boxShadow = `0 0 8px ${online===total?\"var(--green)\":online===0?\"var(--red)\":\"var(--yellow)\"}`;\n}\n\nfunction renderGroup(label, dcs) {\n  const hdr = `<div class=\"group-hdr\">${label}</div>`;\n  const rows = dcs.map((dc, i) => {\n    const hist = histCache[dc.id] || [];\n    const pct = dc.latency ? Math.min(100,(dc.latency/400)*100) : 0;\n    const col = latColor(dc.latency) || \"var(--t3)\";\n    const uptime = hist.length > 0\n      ? Math.round(hist.filter(p=>p.online).length/hist.length*1000)/10\n      : null;\n    return `\n    <div class=\"row${dc.online?\"\":\" row--off\"}\">\n      <div class=\"row__name\">\n        <div class=\"row__id\">${dc.name}</div>\n        <div class=\"row__badges\"><span class=\"badge badge--${dc.type}\">${dc.type.toUpperCase()}</span></div>\n      </div>\n      <div class=\"row__info\">\n        <div class=\"row__loc\">${dc.flag} ${dc.location}</div>\n        <div class=\"row__ip\">${dc.ip}</div>\n        <div class=\"row__bar-wrap\"><div class=\"row__bar\" style=\"width:${pct}%;background:${col}\"></div></div>\n      </div>\n      <div class=\"row__spark\">\n        ${hist.length > 1 ? sparkSvg(hist) : '<div style=\"width:90px;height:20px;display:flex;align-items:center\"><span style=\"font-size:10px;color:var(--t3)\">\u043d\u0430\u043a\u0430\u043f\u043b\u0438\u0432\u0430\u0435\u0442\u0441\u044f\u2026</span></div>'}\n        ${uptime!==null?`<div style=\"font-size:10px;color:${uptime>=99?\"var(--green)\":uptime>=95?\"var(--yellow)\":\"var(--red)\"};margin-top:3px\">${uptime}% up</div>`:\"\"}\n      </div>\n      <div class=\"row__lat\">\n        ${dc.latency !== null\n          ? `<span class=\"lat-num\" style=\"color:${col}\">${dc.latency}</span><span class=\"lat-unit\">ms</span>`\n          : `<span class=\"lat-na\">\u2014</span>`}\n      </div>\n      <div class=\"row__status\"><div class=\"dot dot--${dc.online?\"on\":\"off\"}\"></div></div>\n    </div>`;\n  }).join(\"\");\n  return hdr + rows;\n}\n\nfunction renderGrid(d) {\n  const cdn_neg = d.dcs.filter(dc => dc.id === -203);\n  const media   = d.dcs.filter(dc => dc.id < 0 && dc.id !== -203);\n  const main    = d.dcs.filter(dc => dc.id > 0 && dc.id !== 203);\n  const cdn_pos = d.dcs.filter(dc => dc.id === 203);\n  let out = \"\";\n  if (cdn_neg.length) out += renderGroup(\"CDN\", cdn_neg);\n  if (media.length)   out += renderGroup(\"Media \u0441\u0435\u0440\u0432\u0435\u0440\u044b\", media);\n  if (main.length)    out += renderGroup(\"\u041e\u0441\u043d\u043e\u0432\u043d\u044b\u0435 \u0441\u0435\u0440\u0432\u0435\u0440\u044b\", main);\n  if (cdn_pos.length) out += renderGroup(\"CDN\", [...cdn_neg.length?[]:[...cdn_neg], ...cdn_pos]);\n  document.getElementById(\"grid\").innerHTML = out;\n}\n\nfunction renderSkeletons() {\n  document.getElementById(\"grid\").innerHTML = Array.from({length:12},(_,i)=>`\n    <div class=\"row\" style=\"animation-delay:${i*30}ms\">\n      <div class=\"sk\" style=\"width:54px;height:32px;border-radius:6px\"></div>\n      <div style=\"display:flex;flex-direction:column;gap:5px;flex:1\">\n        <div class=\"sk\" style=\"width:80px;height:10px\"></div>\n        <div class=\"sk\" style=\"width:110px;height:8px\"></div>\n        <div class=\"sk\" style=\"width:100%;height:2px;margin-top:2px\"></div>\n      </div>\n      <div class=\"sk\" style=\"width:50px;height:28px;border-radius:4px;justify-self:end\"></div>\n      <div class=\"sk\" style=\"width:8px;height:8px;border-radius:50%\"></div>\n    </div>`).join(\"\");\n}\n\nasync function fetchHistory(dcs) {\n  await Promise.all(dcs.map(async dc => {\n    try {\n      const r = await fetch(`${W}/api/history?id=${dc.id}`);\n      histCache[dc.id] = await r.json();\n    } catch { histCache[dc.id] = []; }\n  }));\n}\n\nasync function fetchStatus() {\n  const errEl = document.getElementById(\"err\");\n  try {\n    const r = await fetch(`${W}/api/status`);\n    if (!r.ok) throw new Error(r.status);\n    const d = await r.json();\n    data = d;\n    if (initialLoad) {\n      await fetchHistory(d.dcs);\n      initialLoad = false;\n    } else {\n      fetchHistory(d.dcs).then(() => { if(data) renderGrid(data); });\n    }\n    renderSummary(d);\n    renderGrid(d);\n    errEl.style.display = \"none\";\n  } catch(e) {\n    errEl.textContent = \"\u26a0 \u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435\" + (data ? \" \u2014 \u043f\u043e\u043a\u0430\u0437\u0430\u043d\u044b \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435\" : \"\");\n    errEl.style.display = \"block\";\n  }\n}\n\n// Countdown \u2014 single setInterval\nrenderSkeletons();\nfetchStatus().then(() => {\n  countdown = INTERVAL;\n  setInterval(() => {\n    countdown--;\n    const el = document.getElementById(\"countdown\");\n    if (el) el.textContent = countdown + \"\u0441\";\n    if (countdown <= 0) {\n      countdown = INTERVAL;\n      fetchStatus();\n    }\n  }, 1000);\n});\n</script>\n</body>\n</html>";

const DC_LIST = [
  { id: -203, name: "DC -203", ips: ["149.154.167.99"],                   location: "Amsterdam, NL", flag: "🇳🇱", type: "cdn"   },
  { id:   -5, name: "DC -5",  ips: ["91.108.56.130","91.108.56.190"],     location: "Singapore",     flag: "🇸🇬", type: "media" },
  { id:   -4, name: "DC -4",  ips: ["149.154.167.91","149.154.167.171"],  location: "Amsterdam, NL", flag: "🇳🇱", type: "media" },
  { id:   -3, name: "DC -3",  ips: ["149.154.175.100","149.154.175.117"], location: "Miami, USA",    flag: "🇺🇸", type: "media" },
  { id:   -2, name: "DC -2",  ips: ["149.154.167.51","149.154.167.41"],   location: "Amsterdam, NL", flag: "🇳🇱", type: "media" },
  { id:   -1, name: "DC -1",  ips: ["149.154.175.53","149.154.175.50"],   location: "Miami, USA",    flag: "🇺🇸", type: "media" },
  { id:    1, name: "DC 1",   ips: ["149.154.175.53","149.154.175.50"],   location: "Miami, USA",    flag: "🇺🇸", type: "main"  },
  { id:    2, name: "DC 2",   ips: ["149.154.167.51","149.154.167.41"],   location: "Amsterdam, NL", flag: "🇳🇱", type: "main"  },
  { id:    3, name: "DC 3",   ips: ["149.154.175.100","149.154.175.117"], location: "Miami, USA",    flag: "🇺🇸", type: "main"  },
  { id:    4, name: "DC 4",   ips: ["149.154.167.91","149.154.167.171"],  location: "Amsterdam, NL", flag: "🇳🇱", type: "main"  },
  { id:    5, name: "DC 5",   ips: ["91.108.56.130","91.108.56.190"],     location: "Singapore",     flag: "🇸🇬", type: "main"  },
  { id:  203, name: "DC 203", ips: ["149.154.167.99"],                    location: "Amsterdam, NL", flag: "🇳🇱", type: "cdn"   },
];

async function tcpPing(ip: string, port: number, timeoutMs = 4000): Promise<number | null> {
  try {
    const start = performance.now();
    const socket = connect({ hostname: ip, port }, { secureTransport: "off", allowHalfOpen: true });
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), timeoutMs));
    const result = await Promise.race([
      socket.opened.then(() => Math.round(performance.now() - start)),
      timeout
    ]);
    socket.close().catch(() => {});
    return result;
  } catch {
    return null;
  }
}

async function checkDC(dc: (typeof DC_LIST)[0]) {
  const results = await Promise.all(
    dc.ips.map(async (ip) => { const l = await tcpPing(ip, 443); return { ip, latency: l }; })
  );
  const best = results.filter(r => r.latency !== null)
    .sort((a,b) => (a.latency as number)-(b.latency as number))[0] ?? null;
  return {
    id: dc.id, name: dc.name, ip: best?.ip ?? dc.ips[0],
    location: dc.location, flag: dc.flag, type: dc.type,
    latency: best?.latency ?? null, online: best !== null,
    checkedAt: new Date().toISOString(),
  };
}

interface HistoryPoint { ts: number; latency: number | null; online: boolean; }

async function appendHistory(kv: KVNamespace, dcId: number, point: HistoryPoint) {
  const key = `history:${dcId}`;
  const raw = await kv.get(key);
  const arr: HistoryPoint[] = raw ? JSON.parse(raw) : [];
  arr.push(point);
  if (arr.length > 1440) arr.splice(0, arr.length - 1440);
  await kv.put(key, JSON.stringify(arr));
}

async function runChecks(env: Env) {
  const dcs = await Promise.all(DC_LIST.map(checkDC));
  const now = Date.now();
  const online = dcs.filter(d => d.online);
  await env.DC_STORE.put("status:current", JSON.stringify({
    dcs, timestamp: new Date().toISOString(),
    summary: {
      total: dcs.length, online: online.length,
      avgLatency: online.length ? Math.round(online.reduce((a,d) => a+(d.latency??0),0)/online.length) : 0,
    },
  }));
  await Promise.all(dcs.map(dc =>
    appendHistory(env.DC_STORE, dc.id, { ts: now, latency: dc.latency, online: dc.online })
  ));
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (url.pathname === "/api/status") {
    const data = await env.DC_STORE.get("status:current");
    if (!data) {
      await runChecks(env);
      const fresh = await env.DC_STORE.get("status:current");
      return new Response(fresh ?? "{}", { headers: CORS });
    }
    return new Response(data, { headers: { ...CORS, "Cache-Control": "public, max-age=55" } });
  }

  if (url.pathname === "/api/history") {
    const id = url.searchParams.get("id");
    if (!id) return new Response("{}", { status: 400, headers: CORS });
    const raw = await env.DC_STORE.get(`history:${id}`);
    return new Response(raw ?? "[]", { headers: { ...CORS, "Cache-Control": "public, max-age=55" } });
  }

  return new Response(HTML, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await runChecks(env);
  },
};
