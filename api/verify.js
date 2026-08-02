const { FRAGMENTS, MASTER_FLAG, LEGACY_MASTER_FLAG, isRateLimited, applySecurityHeaders } = require('./_secrets');

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

    const f1 = (data.f1 || '').trim();
    const f2 = (data.f2 || '').trim();
    const f3 = (data.f3 || '').trim();
    const submittedFlag = (data.flag || '').trim();

    if (f1.length > 256 || f2.length > 256 || f3.length > 256 || submittedFlag.length > 256) {
      return res.status(400).json({ success: false, error: 'Input length limit exceeded.' });
    }

    const v1Valid = FRAGMENTS[1].includes(f1);
    const v2Valid = FRAGMENTS[2].includes(f2);
    const v3Valid = FRAGMENTS[3].includes(f3);

    if ((v1Valid && v2Valid && v3Valid) || submittedFlag === MASTER_FLAG || submittedFlag === LEGACY_MASTER_FLAG) {
      return res.status(200).json({
        success: true,
        message: 'The X is found. Claim the haul.',
        flag: MASTER_FLAG
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Wrong bearing. The vault stays sealed.'
      });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON request payload' });
  }
};
