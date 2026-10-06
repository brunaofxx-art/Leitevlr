// POST /api/login  -> entra | DELETE /api/login -> sai
// Variáveis: ADMIN_USER, ADMIN_PASS, SESSION_SECRET
const { makeCookie, safeEq, limit, ip } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', 'adm=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') return res.status(405).end();
  const U = process.env.ADMIN_USER, P = process.env.ADMIN_PASS;
  if (!U || !P || !process.env.SESSION_SECRET) return res.status(500).json({ error: 'config' });
  try {
    if (!(await limit('rl:login:' + ip(req), 8, 900))) return res.status(429).json({ error: 'muitas_tentativas' });
  } catch (e) {
    return res.status(500).json({ error: 'db' });
  }
  const b = req.body || {};
  const ok = safeEq(String(b.user || '').toLowerCase(), U.toLowerCase()) & safeEq(String(b.pass || ''), P);
  if (!ok) return res.status(401).json({ error: 'invalido' });
  res.setHeader('Set-Cookie', makeCookie());
  res.status(200).json({ ok: true });
};
