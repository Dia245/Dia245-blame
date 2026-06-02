const twilio = require('twilio');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { phone } = JSON.parse(event.body || '{}');

  if (!phone || !/^\+\d{7,15}$/.test(phone)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Número inválido. Formato: +51987654321' })
    };
  }

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: phone,
        channel: 'sms'
      });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'No se pudo enviar el SMS. Verifica el número.',
        code: err.code
      })
    };
  }
};
