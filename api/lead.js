const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase env vars missing: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
}

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      })
    : null;

// Rate limit muy simple en memoria (por IP, por ventana corta)
const RATE_LIMIT_WINDOW_MS = 15 * 1000; // 15s
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 reqs / 15s
const rateLimitStore = new Map();

function parseUserAgent(ua = '') {
  const agent = ua.toLowerCase();
  const isMobile = /iphone|ipad|ipod|android|mobile/.test(agent);

  let os = 'unknown';
  if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'unknown';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/chrome\//i.test(ua)) browser = 'Chrome';
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = 'Safari';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';

  return {
    dispositivo: isMobile ? 'mobile' : 'desktop',
    sistema_operativo: os,
    navegador: browser
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  if (!supabase) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Supabase not configured' }));
    return;
  }

  const userAgent = req.headers['user-agent'] || '';
  const ipHeader = (req.headers['x-forwarded-for'] || '').toString();
  const ip =
    ipHeader.split(',')[0].trim() || req.socket?.remoteAddress || null;

  // Rate limit simple
  if (ip) {
    const now = Date.now();
    const current = rateLimitStore.get(ip) || { count: 0, windowStart: now };
    if (now - current.windowStart > RATE_LIMIT_WINDOW_MS) {
      current.count = 0;
      current.windowStart = now;
    }
    current.count += 1;
    rateLimitStore.set(ip, current);
    if (current.count > RATE_LIMIT_MAX_REQUESTS) {
      res.statusCode = 429;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Too many requests' }));
      return;
    }
  }

  let body = '';
  await new Promise((resolve, reject) => {
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', resolve);
    req.on('error', reject);
  });

  let payload;
  try {
    payload = body ? JSON.parse(body) : {};
  } catch (_e) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    return;
  }

  if (!payload || typeof payload !== 'object') {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing payload' }));
    return;
  }

  let {
    nombre = null,
    email = null,
    telefono = null,
    destino = null,
    accion = null,
    origen = null
  } = payload;

  // Sanitización mínima y validación obligatoria
  const toSafeString = (value) =>
    typeof value === 'string' ? value.trim() : value === null || value === undefined ? null : String(value).trim();

  nombre = toSafeString(nombre);
  email = toSafeString(email);
  telefono = toSafeString(telefono);
  destino = toSafeString(destino);
  accion = toSafeString(accion);
  origen = toSafeString(origen);

  if (!accion || !origen) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'accion and origen are required' }));
    return;
  }

  const deviceInfo = parseUserAgent(userAgent);

  const leadRow = {
    nombre,
    email,
    telefono,
    destino,
    accion,
    origen,
    dispositivo: deviceInfo.dispositivo,
    sistema_operativo: deviceInfo.sistema_operativo,
    navegador: deviceInfo.navegador,
    ip,
    user_agent: userAgent,
    fecha_hora: new Date().toISOString()
  };

  try {
    const { error } = await supabase.from('leads').insert(leadRow);
    if (error) {
      console.error('Supabase insert error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Error inserting lead' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error('Unexpected error inserting lead:', e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unexpected error' }));
  }
};

