const { FRAGMENTS, isRateLimited, applySecurityHeaders } = require('./_secrets');

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

    const role = (data.role || '').toLowerCase();

    if (role === 'quartermaster' || role === 'captain') {
      return res.status(200).json({
        success: true,
        logId: 'log-1708',
        title: 'Quartermaster Log #1708',
        fragment: FRAGMENTS[2][0],
        notes: 'Sparrow 1708 navigation coordinates verified.'
      });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Quartermaster rank required.'
      });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON request payload' });
  }
};
