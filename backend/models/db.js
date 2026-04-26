const { Pool } = require('pg');

// Pool keeps a set of reusable connections open.
// Creating a new connection for every request is expensive (~50ms).
// A pool reuses existing connections — queries take <1ms to start.
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'gocomet_auction',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 10,          // max simultaneous connections
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err);
});

module.exports = pool;
