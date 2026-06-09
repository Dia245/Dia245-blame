const https = require('https');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { dni } = req.body || {};
  if (!dni || !/^\d{8}$/.test(dni)) {
    return res.status(400).json({ error: 'DNI debe tener 8 dígitos.' });
  }

  const token = process.env.APIPERU_TOKEN || 'b3671822bc57a304ba008f2835b68ba50592a23e6fc6cd7c929afffcb7504c4c';
  const body = JSON.stringify({ dni });

  return new Promise((resolve) => {
    const reqHttp = https.request({
      hostname: 'apiperu.dev',
      path: '/api/dni',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (apiRes) => {
      let data = '';
      apiRes.on('data', c => data += c);
      apiRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success && json.data) {
            res.status(200).json({
              ok: true,
              nombre: json.data.nombre_completo,
              dni: json.data.numero
            });
          } else {
            res.status(404).json({ error: 'DNI no encontrado.' });
          }
        } catch(e) {
          res.status(500).json({ error: 'Error al procesar respuesta.' });
        }
        resolve();
      });
    });
    reqHttp.on('error', (e) => {
      res.status(500).json({ error: e.message });
      resolve();
    });
    reqHttp.write(body);
    reqHttp.end();
  });
};
