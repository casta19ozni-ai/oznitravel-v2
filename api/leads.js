const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminToken = process.env.ADMIN_TOKEN;

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      })
    : null;

function unauthorized(res) {
  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Unauthorized' }));
}

module.exports = async (req, res) => {
  if (!supabase) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Supabase not configured' }));
    return;
  }

  const token = req.headers['x-admin-token'];
  if (!adminToken || !token || token !== adminToken) {
    return unauthorized(res);
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const accion = url.searchParams.get('accion');
  const format = url.searchParams.get('format') || 'json';

  // Paginación básica
  const limitParam = parseInt(url.searchParams.get('limit') || '50', 10);
  const offsetParam = parseInt(url.searchParams.get('offset') || '0', 10);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;
  const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

  // Query base con filtros
  const baseFilter = (query) => {
    let q = query;
    if (from) {
      q = q.gte('fecha_hora', from);
    }
    if (to) {
      q = q.lte('fecha_hora', to);
    }
    if (accion) {
      q = q.eq('accion', accion);
    }
    return q;
  };

  // CSV: exporta todo con filtros (sin paginación)
  if (format === 'csv') {
    let csvQuery = baseFilter(supabase.from('leads').select('*'));
    csvQuery = csvQuery.order('fecha_hora', { ascending: false });
    const { data, error } = await csvQuery;

    if (error) {
      console.error('Error fetching leads (csv):', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Error fetching leads' }));
      return;
    }

    const headers = [
      'id',
      'nombre',
      'email',
      'telefono',
      'destino',
      'accion',
      'origen',
      'dispositivo',
      'sistema_operativo',
      'navegador',
      'ip',
      'user_agent',
      'fecha_hora'
    ];

    const rows = (data || []).map((row) =>
      headers
        .map((h) => {
          const value = row[h] ?? '';
          const v = typeof value === 'string' ? value.replace(/"/g, '""') : String(value);
          return `"${v}"`;
        })
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.end(csv);
    return;
  }

  // JSON: datos paginados + totales + conteo por acción
  let dataQuery = baseFilter(
    supabase.from('leads').select('*', {
      count: 'exact'
    })
  );
  dataQuery = dataQuery
    .order('fecha_hora', { ascending: false })
    .range(offset, offset + limit - 1);

  const [{ data, error, count }, perActionResult] = await Promise.all([
    dataQuery,
    baseFilter(
      supabase
        .from('leads')
        .select('accion, count:id', { head: false })
        .group('accion')
    )
  ]);

  if (error || perActionResult.error) {
    console.error('Error fetching leads:', error || perActionResult.error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Error fetching leads' }));
    return;
  }

  const perAction = (perActionResult.data || []).map((row) => ({
    accion: row.accion,
    total: row.count
  }));

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      leads: data || [],
      total: count || 0,
      perAction,
      limit,
      offset
    })
  );
};


