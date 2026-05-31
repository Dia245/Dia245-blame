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
        to: `whatsapp:${phone}`,
        channel: 'whatsapp'
      });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    // Si el número no tiene WhatsApp, Twilio devuelve error 60203/60200
    const noWhatsapp = [60200, 60203, 21211].includes(err.code);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: noWhatsapp
          ? 'Este número no tiene WhatsApp activo.'
          : 'No se pudo enviar el código. Intenta de nuevo.',
        code: err.code
      })
    };
  }
};
