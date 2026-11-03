const mysql = require('mysql2/promise');

let pool;

function getPool() {
  const required = ['TIDB_HOST', 'TIDB_USER', 'TIDB_PASSWORD', 'TIDB_DATABASE'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    const error = new Error('La conexión con la base de datos no está configurada.');
    error.code = 'DB_CONFIG_MISSING';
    throw error;
  }

  if (!pool) {
    const ssl = process.env.TIDB_SSL_CA
      ? { ca: process.env.TIDB_SSL_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true, minVersion: 'TLSv1.2' }
      : { rejectUnauthorized: true, minVersion: 'TLSv1.2' };
    pool = mysql.createPool({
      host: process.env.TIDB_HOST,
      port: Number(process.env.TIDB_PORT || 4000),
      user: process.env.TIDB_USER,
      password: process.env.TIDB_PASSWORD,
      database: process.env.TIDB_DATABASE,
      ssl,
      waitForConnections: true,
      connectionLimit: 3,
      enableKeepAlive: true,
      decimalNumbers: true
    });
  }
  return pool;
}

function sendJson(response, status, body) {
  response.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

function sendDatabaseError(response, error) {
  if (error.code === 'DB_CONFIG_MISSING') {
    return sendJson(response, 503, { message: error.message });
  }
  console.error('Error al consultar TiDB:', error);
  return sendJson(response, 500, { message: 'No se pudo completar la operación. Inténtalo nuevamente.' });
}

module.exports = { getPool, sendJson, sendDatabaseError };
