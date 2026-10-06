// POST /api/pedido  (público: recebe o formulário do site)
const crypto = require('crypto');
const { redis, limit, ip } = require('./_lib');

const ELOS = ['Ferro', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Ascendente', 'Imortal', 'Radiante'];
const TIPOS = ['Tracker', 'VOD', 'Os dois'];
const cut = (v, n) => String(v || '').trim().slice(0, n);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  const b = req.body || {};
  if (b.site) return res.status(200).json({ ok: true }); // campo-isca anti-robô
  const nick = cut(b.nick, 60);
  if (!nick) return res.status(400).json({ error: 'nick' });
  let link = cut(b.link, 300);
  if (link && !/^https?:\/\//i.test(link)) link = '';
  try {
    if (!(await limit('rl:pedido:' + ip(req), 5, 3600))) return res.status(429).json({ error: 'limite' });
    const p = {
      id: Date.now().toString(36) + crypto.randomBytes(3).toString('hex'),
      criado: Date.now(), status: 'novo', nick,
      elo: ELOS.includes(b.elo) ? b.elo : '?',
      tipo: TIPOS.includes(b.tipo) ? b.tipo : 'Tracker',
      link, msg: cut(b.msg, 1000)
    };
    await redis('HSET', 'pedidos', p.id, JSON.stringify(p));
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'db' });
  }
};
