// ShadowContract — 免费云存档 Worker
// 部署到 Cloudflare Workers，提供两个 HTTP 端点：
//   POST /save  body: {user, pin, db}      → 写入该用户的金币 DB
//   GET  /load?user=X&pin=Y                → 读取该用户的金币 DB
// PIN 第一次写入时自动建立；之后的 read/write 必须 PIN 匹配。
// 注意：这不是真正的安全认证，仅防止偶然的撞用户名。不要存放敏感数据。

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const RATE_LIMIT_WINDOW = 60; // 秒
const RATE_LIMIT_MAX = 20;    // 每窗口最大请求数
const GOLD_MAX_PER_CHAR = 999999; // 单角色金币上限
const GOLD_MAX_KEYS = 50;        // db 最多键数

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function text(status, body) {
  return new Response(body, {
    status,
    headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function validUser(u) {
  return typeof u === 'string' && /^[A-Za-z0-9_\-]{2,32}$/.test(u);
}
function validPin(p) {
  return typeof p === 'string' && /^[0-9]{4,12}$/.test(p);
}

function validDb(db) {
  if (db == null || typeof db !== 'object' || Array.isArray(db)) return false;
  const keys = Object.keys(db);
  if (keys.length > GOLD_MAX_KEYS) return false;
  for (const k of keys) {
    const v = db[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > GOLD_MAX_PER_CHAR) return false;
  }
  return true;
}

async function checkRate(env, ip) {
  const key = `rl:${ip}`;
  const raw = await env.GOLD.get(key);
  let count = 0, windowStart = Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW) * RATE_LIMIT_WINDOW;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.w === windowStart) count = parsed.c;
    } catch {}
  }
  count++;
  await env.GOLD.put(key, JSON.stringify({ w: windowStart, c: count }), { expirationTtl: RATE_LIMIT_WINDOW * 2 });
  return count <= RATE_LIMIT_MAX;
}

export default {
  async fetch(req, env) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (!env.GOLD) {
      return text(500, 'KV namespace "GOLD" 未绑定。去 Worker Settings → Variables → KV Namespace Bindings 添加 GOLD = 你的 KV。');
    }

    // 速率限制：按 IP 限制
    const ip = req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'unknown';
    if (!(await checkRate(env, ip))) {
      return json(429, { error: '请求过于频繁，请稍后再试' });
    }

    const url = new URL(req.url);
    const path = url.pathname;

    try {
      // 健康检查 / 根路径
      if (path === '/' || path === '') {
        return text(200, 'ShadowContract gold-sync OK\n  POST /save  body: {user, pin, db}\n  GET  /load?user=X&pin=Y');
      }

      if (path === '/save' && req.method === 'POST') {
        let body;
        try { body = await req.json(); }
        catch { return json(400, { error: 'body 必须是 JSON' }); }
        const { user, pin, db } = body || {};
        if (!validUser(user)) return json(400, { error: '用户名必须 2-32 位字母/数字/-/_' });
        if (!validPin(pin))   return json(400, { error: 'PIN 必须 4-12 位数字' });
        if (!validDb(db)) return json(400, { error: 'db 必须是对象，值须为 0~999999 的数字，最多 50 键' });

        const stored = await env.GOLD.get(`pin:${user}`);
        if (stored && stored !== pin) return json(403, { error: 'PIN 不匹配 — 这个用户名已被占用' });
        if (!stored) await env.GOLD.put(`pin:${user}`, pin);

        // 限制存档大小（防止滥用：单用户最多 8KB）
        const dbStr = JSON.stringify(db);
        if (dbStr.length > 8192) return json(413, { error: '存档过大（>8KB）' });

        await env.GOLD.put(`gold:${user}`, dbStr);
        return json(200, { ok: true, savedAt: Date.now() });
      }

      if (path === '/load' && req.method === 'GET') {
        const user = url.searchParams.get('user');
        const pin = url.searchParams.get('pin');
        if (!validUser(user)) return json(400, { error: '用户名必须 2-32 位字母/数字/-/_' });
        if (!validPin(pin))   return json(400, { error: 'PIN 必须 4-12 位数字' });

        const stored = await env.GOLD.get(`pin:${user}`);
        if (!stored) return json(200, { db: {}, exists: false, hint: '新用户，首次 /save 时会自动绑定 PIN' });
        if (stored !== pin) return json(403, { error: 'PIN 不匹配' });

        const dbStr = await env.GOLD.get(`gold:${user}`);
        let db = {};
        try { db = dbStr ? JSON.parse(dbStr) : {}; } catch {}
        return json(200, { db, exists: true });
      }

      return json(404, { error: 'not found', path });
    } catch (e) {
      return json(500, { error: String(e && e.message || e) });
    }
  },
};
