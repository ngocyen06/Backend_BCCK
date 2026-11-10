// OWNER: Yến
// Khởi động server: nối DB trước, rồi listen; tắt êm khi nhận SIGINT/SIGTERM.

const app = require('./app');
const env = require('./config/env');
const { getPool, closePool } = require('./config/db');

async function start() {
  try {
    await getPool();
    console.log(`[server] Đã kết nối SQL Server ${env.DB_SERVER}:${env.DB_PORT}/${env.DB_NAME}`);
  } catch (error) {
    console.error('[server] Không kết nối được DB:', error.message);
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    console.log(`[server] Listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  async function shutdown(signal) {
    console.log(`[server] Nhận ${signal}, đang tắt...`);
    server.close(async () => {
      await closePool().catch(() => {});
      process.exit(0);
    });
    // Ép tắt nếu quá 10s.
    setTimeout(() => process.exit(1), 10000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}

if (require.main === module) start();

module.exports = { start };
