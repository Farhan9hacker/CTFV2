const { FRAGMENTS, MASTER_FLAG, LEGACY_MASTER_FLAG } = require('./_secrets');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-CTF', 'Black-Beacon');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. API routes require POST requests.' });
  }

  try {
    let data = req.body;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) { data = {}; }
    } else if (!data) {
      data = {};
    }

    const f1 = (data.f1 || '').trim();
    const f2 = (data.f2 || '').trim();
    const f3 = (data.f3 || '').trim();
    const submittedFlag = (data.flag || '').trim();

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
    return res.status(400).json({ error: 'Invalid JSON' });
  }
};
