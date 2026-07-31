/**
 * Vercel Serverless — إرسال Web Push للأدمن
 * يحتاج: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 */
const webpush = require('web-push');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@schools-system.com';

  if (!publicKey || !privateKey) {
    return res.status(503).json({
      error: 'Push not configured',
      hint: 'Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY on Vercel',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const title = String(body.title || 'إشعار جديد').slice(0, 120);
  const text = String(body.body || '').slice(0, 300);
  const url = String(body.url || '/admin.html').slice(0, 200);
  const subscriptions = Array.isArray(body.subscriptions) ? body.subscriptions : [];

  if (!subscriptions.length) {
    return res.status(400).json({ error: 'No subscriptions' });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const payload = JSON.stringify({ title, body: text, url });
  const results = await Promise.allSettled(
    subscriptions.slice(0, 40).map((sub) => {
      if (!sub || !sub.endpoint) return Promise.reject(new Error('invalid sub'));
      return webpush.sendNotification(sub, payload);
    })
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.length - sent;

  return res.status(200).json({ ok: true, sent, failed });
};
