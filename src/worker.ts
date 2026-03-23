import { connect } from "cloudflare:sockets";

interface Env {
  DC_STORE: KVNamespace;
}

// ─── Frontend HTML ────────────────────────────────────────────────────────────

const HTML: string = "<!DOCTYPE html>\n<html lang=\"ru\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n  <title>Telegram DC Monitor</title>\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />\n  <link href=\"https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600&display=swap\" rel=\"stylesheet\" />\n  <style>\n    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\n    :root{\n      --bg:#0e1117;--sur:#161b27;--sur2:#1e2536;\n      --br:rgba(255,255,255,0.07);\n      --blue:#2AABEE;--green:#00e5a0;--red:#ff4d4d;--yellow:#f5c518;\n      --text:#e8edf5;--muted:#6b7694;\n      --mono:'Space Mono',monospace;--body:'Inter',sans-serif;\n    }\n    html,body{height:100%}\n    body{background:var(--bg);color:var(--text);font-family:var(--body);min-height:100vh;\n      background-image:radial-gradient(ellipse 80% 40% at 50% -10%,rgba(42,171,238,0.07) 0%,transparent 60%)}\n    .app{max-width:600px;margin:0 auto;padding:24px 16px 48px}\n    .muted{color:var(--muted)}\n\n    /* Header */\n    .header{text-align:center;margin-bottom:24px}\n    .header h1{font-family:var(--mono);font-size:19px;font-weight:700;letter-spacing:-.5px}\n    .header p{font-size:11px;color:var(--muted);margin-top:3px}\n\n    /* Summary */\n    .summary{background:var(--sur);border:1px solid var(--br);border-radius:14px;\n      padding:13px 16px;display:flex;align-items:center;gap:10px;margin-bottom:14px}\n    .sum-status{font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:1.5px;padding:4px 9px;border-radius:7px;white-space:nowrap}\n    .sum-status--ok{background:rgba(0,229,160,.12);color:var(--green)}\n    .sum-status--issues{background:rgba(245,197,24,.12);color:var(--yellow)}\n    .sum-status--down{background:rgba(255,77,77,.12);color:var(--red)}\n    .sum-info{flex:1;font-size:13px;color:var(--muted)}\n    .sum-info strong{color:var(--text)}\n    .sum-right{font-size:11px;color:var(--muted);font-family:var(--mono);white-space:nowrap}\n\n    /* Cards */\n    .cards{display:flex;flex-direction:column;gap:9px}\n    .card{background:var(--sur);border:1px solid var(--br);border-radius:13px;padding:14px 16px;\n      animation:slideIn .3s ease both;transition:transform .15s,box-shadow .15s,opacity .2s}\n    .card:hover{transform:translateY(-1px);box-shadow:0 5px 20px rgba(0,0,0,.3)}\n    .card--on{border-color:rgba(0,229,160,.1)}\n    .card--off{border-color:rgba(255,77,77,.15);background:rgba(255,77,77,.02)}\n    .cards--refreshing .card{opacity:.65}\n    @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}\n\n    .card__head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}\n    .card__title-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}\n    .card__name{font-family:var(--mono);font-weight:700;font-size:14px}\n    .card__meta{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--muted)}\n    .card__ip{font-family:var(--mono);font-size:11px;color:var(--muted);margin-bottom:9px}\n    .lat-val{font-family:var(--mono);font-size:23px;font-weight:700;display:block;margin-bottom:6px}\n    .lat-unit{font-size:12px;color:var(--muted);margin-left:2px;font-weight:400}\n    .lat-na{font-family:var(--mono);font-size:20px;color:var(--muted)}\n    .lb-wrap{height:3px;background:var(--sur2);border-radius:3px;overflow:hidden;margin-bottom:12px}\n    .lb-fill{height:100%;border-radius:3px;transition:width .5s ease}\n\n    /* Badges */\n    .tbadge,.sbadge{font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:1px;padding:2px 6px;border-radius:4px}\n    .tbadge--main{background:rgba(42,171,238,.12);color:var(--blue)}\n    .tbadge--media{background:rgba(180,130,255,.12);color:#b482ff}\n    .tbadge--cdn{background:rgba(245,197,24,.12);color:var(--yellow)}\n    .sbadge--on{background:rgba(0,229,160,.12);color:var(--green)}\n    .sbadge--off{background:rgba(255,77,77,.12);color:var(--red)}\n\n    /* Pulse */\n    .pulse-ring{width:10px;height:10px;border-radius:50%;position:relative;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}\n    .pr--on{background:rgba(0,229,160,.2)}.pr--off{background:rgba(255,77,77,.2)}\n    .pulse-dot{width:6px;height:6px;border-radius:50%;position:relative}\n    .pr--on .pulse-dot{background:var(--green)}.pr--off .pulse-dot{background:var(--red)}\n    .pr--on .pulse-dot::after{content:'';position:absolute;inset:-3px;border-radius:50%;background:rgba(0,229,160,.4);animation:ping 1.5s infinite}\n    @keyframes ping{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.5);opacity:0}}\n\n    /* Sparkline */\n    .sparkline-wrap{margin-top:4px}\n    .sparkline-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;font-family:var(--mono);font-size:10px;color:var(--muted)}\n    .uptime-good{color:var(--green)}.uptime-warn{color:var(--yellow)}.uptime-bad{color:var(--red)}\n\n    /* Skeleton */\n    .sk{background:var(--sur2);border-radius:4px;animation:shimmer 1.4s infinite}\n    .sk--xs{width:32px;height:14px}.sk--sm{width:54px;height:14px}\n    .sk--md{width:90px;height:14px}.sk--lg{width:70px;height:28px}\n    .sk-row{display:flex;align-items:center;gap:8px}\n    @keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.7}}\n\n    .err{background:rgba(255,77,77,.08);border:1px solid rgba(255,77,77,.2);border-radius:11px;padding:13px;text-align:center;color:var(--red);font-size:13px;margin-bottom:12px}\n  </style>\n</head>\n<body>\n<div class=\"app\">\n  <header class=\"header\">\n    <h1>Telegram DC Monitor</h1>\n    <p>TCP connect \u00b7 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u0435 \u043a\u0430\u0436\u0434\u0443\u044e \u043c\u0438\u043d\u0443\u0442\u0443</p>\n  </header>\n\n  <div class=\"summary\" id=\"summary\">\n    <div class=\"sk sk--sm\"></div>\n    <div class=\"sk sk--md\" style=\"flex:1\"></div>\n    <div class=\"sk sk--sm\"></div>\n  </div>\n\n  <div id=\"error-box\" style=\"display:none\" class=\"err\"></div>\n\n  <div class=\"cards\" id=\"cards\">\n    <!-- skeletons injected by JS -->\n  </div>\n</div>\n\n<script>\n  // \u2500\u2500 Config \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  // Worker URL will be set after deploy \u2014 injected at build or set manually\n  const WORKER_URL = \"https://tg-dc-monitor.aerostovtsev.workers.dev\";\n\n  const REFRESH_INTERVAL = 60; // seconds\n\n  // \u2500\u2500 State \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  let currentData = null;\n  let historyCache = {};\n  let countdown = REFRESH_INTERVAL;\n  let initialLoad = true;\n\n  // \u2500\u2500 Skeleton \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  function renderSkeletons() {\n    const container = document.getElementById(\"cards\");\n    container.innerHTML = Array.from({ length: 12 }, (_, i) => `\n      <div class=\"card\" style=\"animation-delay:${i * 35}ms\">\n        <div class=\"sk-row\">\n          <div class=\"sk sk--sm\"></div>\n          <div class=\"sk sk--md\"></div>\n          <div class=\"sk sk--xs\"></div>\n        </div>\n        <div class=\"sk sk--sm\" style=\"margin-top:10px\"></div>\n        <div class=\"sk sk--lg\" style=\"margin-top:10px\"></div>\n      </div>`).join(\"\");\n  }\n\n  // \u2500\u2500 Sparkline SVG \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  function sparkline(points, w = 140, h = 28) {\n    if (!points || points.length < 2) return \"\";\n    const BW = 3, GAP = 1;\n    const maxBars = Math.floor(w / (BW + GAP));\n    const vis = points.slice(-maxBars);\n    const maxLat = Math.max(...vis.filter(p => p.latency).map(p => p.latency), 1);\n\n    const bars = vis.map((p, i) => {\n      const bh = p.online && p.latency\n        ? Math.max(3, Math.round((p.latency / maxLat) * (h - 4)))\n        : 3;\n      const color = !p.online ? \"#ff4d4d\"\n        : p.latency < 80 ? \"#00e5a0\"\n        : p.latency < 200 ? \"#f5c518\" : \"#ff9040\";\n      return `<rect x=\"${i*(BW+GAP)}\" y=\"${h-bh}\" width=\"${BW}\" height=\"${bh}\" rx=\"1\" fill=\"${color}\" opacity=\"0.85\"/>`;\n    }).join(\"\");\n\n    return `<svg width=\"${w}\" height=\"${h}\" style=\"display:block\">${bars}</svg>`;\n  }\n\n  function uptimeClass(pct) {\n    return pct >= 99 ? \"uptime-good\" : pct >= 95 ? \"uptime-warn\" : \"uptime-bad\";\n  }\n\n  // \u2500\u2500 Render DC card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  function renderCard(dc, history, index) {\n    const latColor = !dc.latency ? null\n      : dc.latency < 80 ? \"#00e5a0\"\n      : dc.latency < 200 ? \"#f5c518\" : \"#ff4d4d\";\n    const pct = dc.latency ? Math.min(100, (dc.latency / 500) * 100) : 0;\n\n    const uptime = history && history.length > 0\n      ? Math.round((history.filter(p => p.online).length / history.length) * 1000) / 10\n      : null;\n\n    const sparkSvg = history && history.length > 1 ? `\n      <div class=\"sparkline-wrap\">\n        <div class=\"sparkline-header\">\n          <span>24h \u0438\u0441\u0442\u043e\u0440\u0438\u044f</span>\n          ${uptime !== null ? `<span class=\"${uptimeClass(uptime)}\">${uptime}% uptime</span>` : \"\"}\n        </div>\n        ${sparkline(history)}\n      </div>` : \"\";\n\n    return `\n      <div class=\"card ${dc.online ? \"card--on\" : \"card--off\"}\" style=\"animation-delay:${index*40}ms\">\n        <div class=\"card__head\">\n          <div class=\"card__title-row\">\n            <span class=\"pulse-ring ${dc.online ? \"pr--on\" : \"pr--off\"}\"><span class=\"pulse-dot\"></span></span>\n            <span class=\"card__name\">${dc.name}</span>\n            <span class=\"tbadge tbadge--${dc.type}\">${dc.type.toUpperCase()}</span>\n            <span class=\"sbadge ${dc.online ? \"sbadge--on\" : \"sbadge--off\"}\">${dc.online ? \"ONLINE\" : \"OFFLINE\"}</span>\n          </div>\n          <div class=\"card__meta\">\n            <span>${dc.flag}</span>\n            <span class=\"muted\">${dc.location}</span>\n          </div>\n        </div>\n        <div class=\"card__ip muted\">${dc.ip}</div>\n        ${dc.latency !== null\n          ? `<span class=\"lat-val\">${dc.latency}<span class=\"lat-unit\">ms</span></span>\n             <div class=\"lb-wrap\"><div class=\"lb-fill\" style=\"width:${pct}%;background:${latColor}\"></div></div>`\n          : `<span class=\"lat-na\">\u2014 ms</span>`\n        }\n        ${sparkSvg}\n      </div>`;\n  }\n\n  // \u2500\u2500 Render all cards \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  function renderCards(data) {\n    const container = document.getElementById(\"cards\");\n    container.innerHTML = data.dcs\n      .map((dc, i) => renderCard(dc, historyCache[dc.id] || [], i))\n      .join(\"\");\n  }\n\n  // \u2500\u2500 Render summary bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  function renderSummary(data) {\n    const { online, total, avgLatency } = data.summary;\n    const allOk = online === total;\n    const statusClass = allOk ? \"sum-status--ok\" : online === 0 ? \"sum-status--down\" : \"sum-status--issues\";\n    const statusText = allOk ? \"ALL OK\" : online === 0 ? \"DOWN\" : \"ISSUES\";\n    document.getElementById(\"summary\").innerHTML = `\n      <span class=\"sum-status ${statusClass}\">${statusText}</span>\n      <div class=\"sum-info\"><strong>${online}/${total}</strong> online \u00b7 avg <strong>${avgLatency}ms</strong></div>\n      <span class=\"sum-right muted\" id=\"countdown\">\u0447\u0435\u0440\u0435\u0437 ${countdown}\u0441</span>`;\n  }\n\n  // \u2500\u2500 Fetch history for all DCs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  async function fetchHistory(dcs) {\n    await Promise.all(dcs.map(async (dc) => {\n      try {\n        const res = await fetch(`${WORKER_URL}/api/history?id=${dc.id}`);\n        historyCache[dc.id] = await res.json();\n      } catch { historyCache[dc.id] = []; }\n    }));\n  }\n\n  // \u2500\u2500 Main fetch \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  async function fetchStatus() {\n    const errBox = document.getElementById(\"error-box\");\n    const cards = document.getElementById(\"cards\");\n\n    try {\n      const res = await fetch(`${WORKER_URL}/api/status`);\n      if (!res.ok) throw new Error(\"HTTP \" + res.status);\n      const data = await res.json();\n      currentData = data;\n\n      // On first load: wait for history before rendering (prevents flicker)\n      // On subsequent loads: render immediately, update history silently\n      if (initialLoad) {\n        await fetchHistory(data.dcs);\n        initialLoad = false;\n      } else {\n        fetchHistory(data.dcs).then(() => {\n          if (currentData) renderCards(currentData);\n        });\n      }\n\n      renderSummary(data);\n      cards.classList.remove(\"cards--refreshing\");\n      renderCards(data);\n      errBox.style.display = \"none\";\n    } catch (e) {\n      errBox.textContent = \"\u26a0\ufe0f \u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435 \u2014 \u043f\u043e\u043a\u0430\u0437\u0430\u043d\u044b \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435\";\n      errBox.style.display = \"block\";\n      if (initialLoad) cards.innerHTML = \"\";\n    }\n  }\n\n  // \u2500\u2500 Countdown timer \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  function startCountdown() {\n    countdown = REFRESH_INTERVAL;\n    setInterval(() => {\n      countdown--;\n      if (countdown <= 0) {\n        countdown = REFRESH_INTERVAL;\n        // Dim cards while refreshing\n        document.getElementById(\"cards\").classList.add(\"cards--refreshing\");\n        fetchStatus();\n      }\n      const el = document.getElementById(\"countdown\");\n      if (el) el.textContent = `\u0447\u0435\u0440\u0435\u0437 ${countdown}\u0441`;\n    }, 1000);\n  }\n\n  // \u2500\u2500 Init \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n  renderSkeletons();\n  fetchStatus().then(startCountdown);\n</script>\n</body>\n</html>\n";

// ─── DC list ──────────────────────────────────────────────────────────────────

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

const PORTS = [443, 80, 5222];

// ─── TCP ping ─────────────────────────────────────────────────────────────────

async function tcpPing(ip: string, port: number, timeoutMs = 3000): Promise<number | null> {
  const start = Date.now();
  try {
    const socket = connect({ hostname: ip, port }, { secureTransport: "off", allowHalfOpen: true });
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const opened = socket.opened.then(() => Date.now() - start);
    const result = await Promise.race([opened, timeout]);
    await socket.close().catch(() => {});
    return result;
  } catch {
    return null;
  }
}

// ─── Check single DC ──────────────────────────────────────────────────────────

async function checkDC(dc: (typeof DC_LIST)[0]) {
  const results = await Promise.all(
    dc.ips.map(async (ip) => {
      const latency = await tcpPing(ip, 443);
      return { ip, latency };
    })
  );
  const best = results
    .filter((r) => r.latency !== null)
    .sort((a, b) => (a.latency as number) - (b.latency as number))[0] ?? null;
  return {
    id: dc.id, name: dc.name, ip: best?.ip ?? dc.ips[0],
    location: dc.location, flag: dc.flag, type: dc.type,
    latency: best?.latency ?? null, online: best !== null,
    checkedAt: new Date().toISOString(),
  };
}

// ─── History ──────────────────────────────────────────────────────────────────

interface HistoryPoint { ts: number; latency: number | null; online: boolean; }
const MAX_HISTORY = 1440;

async function appendHistory(kv: KVNamespace, dcId: number, point: HistoryPoint) {
  const key = `history:${dcId}`;
  const raw = await kv.get(key);
  const arr: HistoryPoint[] = raw ? JSON.parse(raw) : [];
  arr.push(point);
  if (arr.length > MAX_HISTORY) arr.splice(0, arr.length - MAX_HISTORY);
  await kv.put(key, JSON.stringify(arr));
}

// ─── Run checks ───────────────────────────────────────────────────────────────

async function runChecks(env: Env) {
  const dcs = await Promise.all(DC_LIST.map(checkDC));
  const now = Date.now();
  const online = dcs.filter((d) => d.online);
  await env.DC_STORE.put("status:current", JSON.stringify({
    dcs,
    timestamp: new Date().toISOString(),
    summary: {
      total: dcs.length,
      online: online.length,
      avgLatency: online.length
        ? Math.round(online.reduce((a, d) => a + (d.latency ?? 0), 0) / online.length)
        : 0,
    },
  }));
  await Promise.all(
    dcs.map((dc) => appendHistory(env.DC_STORE, dc.id, { ts: now, latency: dc.latency, online: dc.online }))
  );
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

// ─── HTTP handler ─────────────────────────────────────────────────────────────

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (url.pathname === "/api/status") {
    const data = await env.DC_STORE.get("status:current");
    if (!data) {
      await runChecks(env);
      const fresh = await env.DC_STORE.get("status:current");
      return new Response(fresh ?? "{}", { headers: CORS });
    }
    return new Response(data, { headers: { ...CORS, "Cache-Control": "public, max-age=30" } });
  }

  if (url.pathname === "/api/history") {
    const id = url.searchParams.get("id");
    if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: CORS });
    const raw = await env.DC_STORE.get(`history:${id}`);
    return new Response(raw ?? "[]", { headers: { ...CORS, "Cache-Control": "public, max-age=30" } });
  }

  return new Response(HTML, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await runChecks(env);
  },
};
