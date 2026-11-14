// OWNER: Yến
// Lắp Express: middleware chung, routes, notFound, errorHandler (CONTRACT.md:14-27).

const express = require('express');
const cors = require('cors');

const env = require('./config/env');
const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.disable('x-powered-by');
// CORS_ORIGIN có thể là '*' hoặc danh sách domain cách nhau bởi dấu phẩy.
const corsOrigin =
  !env.CORS_ORIGIN || env.CORS_ORIGIN === '*'
    ? true
    : env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Swagger là file của Hiếu; nạp mềm để app vẫn chạy khi chưa có.
try {
  const swagger = require('./config/swagger');
  if (swagger && typeof swagger.mountSwagger === 'function') {
    swagger.mountSwagger(app, '/api-docs');
  }
} catch (error) {
  console.warn(`[app] Không mount được Swagger: ${error.message}`);
}

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
