const https = require('https');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function twilioRequest(path, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const auth = Buffer.from(sid + ':' + token).toString('base64');
  const data = new URLSearchParams(body).toString();
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'verify.twilio.com',
      path: path,
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { phone, email, channel } = req.body || {};
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!sid) return res.status(500).json({ error: 'Config error: missing TWILIO_VERIFY_SERVICE_SID' });

  const to = channel === 'email' ? email : phone;
  const ch = channel === 'email' ? 'email' : 'sms';

  if (!to) return res.status(400).json({ error: ch === 'email' ? 'Correo inválido.' : 'Número inválido.' });

  try {
    const result = await twilioRequest(
      `/v2/Services/${sid}/Verifications`,
      { To: to, Channel: ch }
    );
    if (result.status >= 400) return res.status(400).json({ error: result.body.message || 'Error al enviar' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
