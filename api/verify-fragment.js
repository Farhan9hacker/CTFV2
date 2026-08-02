const { FRAGMENTS, PASSPHRASES, isRateLimited, applySecurityHeaders } = require('./_secrets');

module.exports = (req, res) => {
  applySecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. API routes require POST requests.' });
  }

  if (isRateLimited(req)) {
    return res.status(429).json({
      success: false,
      error: 'Too Many Requests. Rate limit exceeded. Try again in 60 seconds.'
    });
  }

  try {
    let data = req.body;
    if (typeof data === 'string') {
      if (data.length > 4096) {
        return res.status(413).json({ error: 'Payload Too Large' });
      }
      try { data = JSON.parse(data); } catch (e) { data = {}; }
    } else if (!data) {
      data = {};
    }

    const stage = parseInt(data.stage, 10);
    const value = (data.value || '').trim();

    if (value.length > 256) {
      return res.status(400).json({ success: false, error: 'Input value exceeds maximum length.' });
    }

    if (stage === 1 && FRAGMENTS[1].includes(value)) {
      return res.status(200).json({
        success: true,
        message: 'First Map Fragment verified by Quartermaster.',
        fragment: FRAGMENTS[1][0]
      });
    }

    if (stage === 2 && FRAGMENTS[2].includes(value)) {
      return res.status(200).json({
        success: true,
        message: 'Second Map Fragment verified by Beacon Keeper.',
        fragment: FRAGMENTS[2][0]
      });
    }

    if (stage === 3 && (value.toUpperCase() === PASSPHRASES.strongbox || FRAGMENTS[3].includes(value))) {
      return res.status(200).json({
        success: true,
        message: 'Strongbox cipher unsealed.',
        fragment: FRAGMENTS[3][0]
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid fragment or passphrase offered to the sea.'
    });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON request payload' });
  }
};
