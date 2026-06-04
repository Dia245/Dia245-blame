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

  const { phone, email, channel } = req.body || {};
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  if (channel === 'email') {
    if (!email || !email.includes('@'))
      return res.status(400).json({ error: 'Correo electrónico inválido.' });
    try {
      await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to: email, channel: 'email' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(400).json({ error: 'No se pudo enviar el código al correo.', code: err.code });
    }
  }

  if (!phone || !/^\+\d{7,15}$/.test(phone))
    return res.status(400).json({ error: 'Número inválido. Formato: +51987654321' });
  try {
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phone, channel: 'sms' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: 'No se pudo enviar el SMS.', code: err.code });
  }
};
