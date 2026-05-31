const twilio = require('twilio');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { phone, code } = JSON.parse(event.body || '{}');

  if (!phone || !code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Faltan parámetros.' })
    };
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    const result = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: `whatsapp:${phone}`,
        code
      });

    if (result.status === 'approved') {
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, verified: true })
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Código incorrecto o expirado.' })
      };
    }
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Código incorrecto o expirado.' })
    };
  }
};
