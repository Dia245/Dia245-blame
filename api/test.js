module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const sid = process.env.TWILIO_ACCOUNT_SID || '';
  const token = process.env.TWILIO_AUTH_TOKEN || '';
  const service = process.env.TWILIO_VERIFY_SERVICE_SID || '';
  res.status(200).json({
    TWILIO_ACCOUNT_SID: sid ? sid.substring(0,6)+'...' : 'MISSING',
    TWILIO_AUTH_TOKEN: token ? token.substring(0,4)+'...' : 'MISSING',
    TWILIO_VERIFY_SERVICE_SID: service ? service.substring(0,6)+'...' : 'MISSING'
  });
};
