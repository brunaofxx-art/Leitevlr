// /api/admin (só com login): GET lista | PATCH muda status | DELETE apaga
const { redis, isAdmin } = require('./_lib');
const STATUS = ['novo', 'analisando', 'concluido'];

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAdmin(req)) return res.status(401).json({ error: 'auth' });
  try {
    if (req.method === 'GET') {
      const a = (await redis('HGETALL', 'pedidos')) || [];
      const out = [];
      for (let i = 1; i < a.length; i += 2) { try { out.push(JSON.parse(a[i])); } catch (e) {} }
      out.sort((x, y) => y.criado - x.criado);
      return res.status(200).json({ pedidos: out });
    }
    const b = req.body || {};
    const id = String(b.id || '');
    if (!id) return res.status(400).json({ error: 'id' });
    if (req.method === 'PATCH') {
      if (!STATUS.includes(b.status)) return res.status(400).json({ error: 'status' });
      const raw = await redis('HGET', 'pedidos', id);
      if (!raw) return res.status(404).json({ error: 'nao_encontrado' });
      const p = JSON.parse(raw);
      p.status = b.status;
      await redis('HSET', 'pedidos', id, JSON.stringify(p));
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'DELETE') {
      await redis('HDEL', 'pedidos', id);
      return res.status(200).json({ ok: true });
    }
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: 'db' });
  }
};
