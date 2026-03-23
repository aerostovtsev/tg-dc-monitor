import { connect } from "cloudflare:sockets";

interface Env {
  DC_STORE: KVNamespace;
}

// ─── DC list ────────────────────────────────────────────────────────────────

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

// ─── TCP ping via cloudflare:sockets ────────────────────────────────────────

async function tcpPing(ip: string, port: number, timeoutMs = 3000): Promise<number | null> {
  const start = Date.now();
  try {
    const socket = connect({ hostname: ip, port }, { secureTransport: "off", allowHalfOpen: false });
    const writer = socket.writable.getWriter();

    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const connected = writer.ready.then(() => Date.now() - start);

    const result = await Promise.race([connected, timeout]);
    await socket.close().catch(() => {});
    return result;
  } catch {
    return null;
  }
}

// ─── Check single DC ────────────────────────────────────────────────────────

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
    id: dc.id,
    name: dc.name,
    ip: best?.ip ?? dc.ips[0],
    location: dc.location,
    flag: dc.flag,
    type: dc.type,
    latency: best?.latency ?? null,
    online: best !== null,
    checkedAt: new Date().toISOString(),
  };
}

// ─── History helpers ─────────────────────────────────────────────────────────

interface HistoryPoint { ts: number; latency: number | null; online: boolean; }

const MAX_HISTORY = 1440; // 24h @ 1 per minute

async function appendHistory(kv: KVNamespace, dcId: number, point: HistoryPoint) {
  const key = `history:${dcId}`;
  const raw = await kv.get(key);
  const arr: HistoryPoint[] = raw ? JSON.parse(raw) : [];
  arr.push(point);
  if (arr.length > MAX_HISTORY) arr.splice(0, arr.length - MAX_HISTORY);
  await kv.put(key, JSON.stringify(arr));
}

// ─── Run all checks + store to KV ───────────────────────────────────────────

async function runChecks(env: Env) {
  const dcs = await Promise.all(DC_LIST.map(checkDC));
  const now = Date.now();

  // Save current status snapshot
  await env.DC_STORE.put("status:current", JSON.stringify({
    dcs,
    timestamp: new Date().toISOString(),
    summary: {
      total: dcs.length,
      online: dcs.filter((d) => d.online).length,
      avgLatency: (() => {
        const online = dcs.filter((d) => d.latency !== null);
        return online.length
          ? Math.round(online.reduce((a, d) => a + (d.latency ?? 0), 0) / online.length)
          : 0;
      })(),
    },
  }));

  // Append each DC result to history
  await Promise.all(
    dcs.map((dc) =>
      appendHistory(env.DC_STORE, dc.id, { ts: now, latency: dc.latency, online: dc.online })
    )
  );
}

// ─── CORS headers ────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

// ─── HTTP handler ────────────────────────────────────────────────────────────

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // GET /api/status → current snapshot from KV (instant)
  if (url.pathname === "/api/status") {
    const data = await env.DC_STORE.get("status:current");
    if (!data) {
      // KV empty — run live check
      await runChecks(env);
      const fresh = await env.DC_STORE.get("status:current");
      return new Response(fresh ?? "{}", { headers: CORS });
    }
    return new Response(data, { headers: { ...CORS, "Cache-Control": "public, max-age=30" } });
  }

  // GET /api/history?id=2 → last 24h for one DC
  if (url.pathname === "/api/history") {
    const id = url.searchParams.get("id");
    if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: CORS });
    const raw = await env.DC_STORE.get(`history:${id}`);
    return new Response(raw ?? "[]", { headers: { ...CORS, "Cache-Control": "public, max-age=30" } });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: CORS });
}

// ─── Export ──────────────────────────────────────────────────────────────────

export default {
  // HTTP requests
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },

  // Cron trigger — every minute
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await runChecks(env);
  },
};
