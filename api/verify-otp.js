const twilio = require('twilio');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { to, code } = req.body || {};
  if (!to || !code) return res.status(400).json({ error: 'Faltan parámetros.' });

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  try {
    const result = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to, code });
    if (result.status === 'approved')
      return res.status(200).json({ ok: true, verified: true });
    return res.status(400).json({ error: 'Código incorrecto o expirado.' });
  } catch (err) {
    return res.status(400).json({ error: 'Código incorrecto o expirado.' });
  }
};
