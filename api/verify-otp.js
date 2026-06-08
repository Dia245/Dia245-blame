const https = require('https');

function setCors(res) {
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
      path,
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, body: { raw: body } });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { to, code } = req.body || {};
  console.log('[verify-otp] to:', to, 'code:', code);

  if (!to || !code) {
    return res.status(400).json({ error: 'Faltan parámetros: to=' + to + ' code=' + code });
  }

  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  console.log('[verify-otp] serviceSid:', serviceSid ? serviceSid.slice(0,10)+'...' : 'MISSING');

  try {
    const result = await twilioRequest(
      `/v2/Services/${serviceSid}/VerificationChecks`,
      { To: to, Code: code }
    );
    console.log('[verify-otp] Twilio status:', result.status, 'body:', JSON.stringify(result.body));

    if (result.status >= 400) {
      return res.status(400).json({
        error: result.body.message || 'Código incorrecto o expirado.',
        twilio_status: result.status,
        twilio_body: result.body
      });
    }
    if (result.body.status === 'approved') {
      return res.status(200).json({ ok: true, verified: true });
    }
    return res.status(400).json({
      error: 'Código no aprobado. Estado: ' + result.body.status,
      twilio_body: result.body
    });
  } catch (err) {
    console.log('[verify-otp] exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
