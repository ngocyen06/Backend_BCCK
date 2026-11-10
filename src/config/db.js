// OWNER: Yến
// Kết nối SQL Server dùng chung cho toàn ứng dụng (CONTRACT.md:19).
// Chỉ file này tạo/giữ ConnectionPool; repository lấy pool qua getPool().

const sql = require('mssql');
const env = require('./env');

const config = {
  server: env.DB_SERVER,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  options: {
    encrypt: env.DB_ENCRYPT,
    trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
    enableArithAbort: true,
  },
  pool: {
    max: env.DB_POOL_MAX,
    min: env.DB_POOL_MIN,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: env.DB_CONNECTION_TIMEOUT_MS,
  requestTimeout: env.DB_REQUEST_TIMEOUT_MS,
};

let poolPromise = null;

/**
 * Lấy ConnectionPool, tạo mới ở lần gọi đầu tiên.
 * @returns {Promise<import('mssql').ConnectionPool>}
 */
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .catch((error) => {
        poolPromise = null;
        throw error;
      });
  }
  return poolPromise;
}

/**
 * Đóng pool (dùng khi tắt server hoặc kết thúc test).
 * @returns {Promise<void>}
 */
async function closePool() {
  if (!poolPromise) return;
  const pool = await poolPromise.catch(() => null);
  poolPromise = null;
  if (pool) await pool.close();
}

module.exports = { sql, getPool, closePool, config };
