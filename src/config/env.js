// OWNER: Yến
// Đọc và kiểm tra biến môi trường một lần khi khởi động (CONTRACT.md:9).
// Không rải process.env khắp code: mọi nơi cần cấu hình đều require('../config/env').

require('dotenv').config();

function optional(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  return String(raw).trim();
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: toInt(optional('PORT', '3000'), 3000),

  DB_SERVER: optional('DB_SERVER', 'localhost'),
  DB_PORT: toInt(optional('DB_PORT', '1433'), 1433),
  DB_NAME: optional('DB_NAME', 'QuizExamDb'),
  DB_USER: optional('DB_USER', 'sa'),
  DB_PASSWORD: optional('DB_PASSWORD', ''),
  DB_ENCRYPT: optional('DB_ENCRYPT', 'false') === 'true',
  DB_TRUST_SERVER_CERTIFICATE:
    optional('DB_TRUST_SERVER_CERTIFICATE', 'true') === 'true',
  DB_POOL_MAX: toInt(optional('DB_POOL_MAX', '10'), 10),
  DB_POOL_MIN: toInt(optional('DB_POOL_MIN', '0'), 0),
  DB_CONNECTION_TIMEOUT_MS: toInt(optional('DB_CONNECTION_TIMEOUT_MS', '15000'), 15000),
  DB_REQUEST_TIMEOUT_MS: toInt(optional('DB_REQUEST_TIMEOUT_MS', '30000'), 30000),

  JWT_SECRET: optional('JWT_SECRET', ''),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '2h'),

  BCRYPT_SALT_ROUNDS: toInt(optional('BCRYPT_SALT_ROUNDS', '10'), 10),

  CORS_ORIGIN: optional('CORS_ORIGIN', '*'),

  GEMINI_API_KEY: optional('GEMINI_API_KEY', ''),
};

// Bắt buộc phải có secret khi chạy thật; ở test cho phép mặc định để test schema không chết.
if (env.NODE_ENV !== 'test' && !env.JWT_SECRET) {
  throw new Error('Thiếu biến môi trường bắt buộc: JWT_SECRET');
}

module.exports = env;
