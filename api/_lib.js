// Funções compartilhadas (arquivos que começam com _ não viram rota no Vercel)
const crypto = require('crypto');

const RU = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const RT = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function redis(...cmd) {
  if (!RU || !RT) throw new Error('no_db');
  const r = await fetch(RU, { method: 'POST', headers: { Authorization: 'Bearer ' + RT }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

const sign = v => crypto.createHmac('sha256', process.env.SESSION_SECRET || '').update(v).digest('hex');

function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function makeCookie() {
  const exp = String(Date.now() + 7 * 864e5);
  return `adm=${exp}.${sign(exp)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 86400}`;
}

function isAdmin(req) {
  if (!process.env.SESSION_SECRET) return false;
  const m = (req.headers.cookie || '').match(/(?:^|; )adm=([^;]+)/);
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEq(sig, sign(exp));
}

async function limit(key, max, secs) {
  const n = await redis('INCR', key);
  if (n === 1) await redis('EXPIRE', key, secs);
  return n <= max;
}

const ip = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';

module.exports = { redis, makeCookie, isAdmin, safeEq, limit, ip };
