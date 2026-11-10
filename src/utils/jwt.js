// OWNER: Yến
// Ký/xác thực JWT. Payload { id, role }, hết hạn theo JWT_EXPIRES_IN (CONTRACT.md:38).

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Ký token cho người dùng.
 * @param {{ id: number, role: string }} payload
 * @returns {string}
 */
function signToken(payload) {
  return jwt.sign({ id: payload.id, role: payload.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/**
 * Xác thực token, trả payload hoặc null nếu không hợp lệ/hết hạn.
 * @param {string} token
 * @returns {{ id: number, role: string } | null}
 */
function verifyToken(token) {
  if (typeof token !== 'string' || !token) return null;
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!decoded || typeof decoded !== 'object') return null;
    const id = Number(decoded.id);
    if (!Number.isInteger(id) || id <= 0) return null;
    if (typeof decoded.role !== 'string' || !decoded.role) return null;
    return { id, role: decoded.role };
  } catch (error) {
    return null;
  }
}

/**
 * Đọc token từ header "Authorization: Bearer <token>".
 * @param {string | undefined} header
 * @returns {string | null}
 */
function extractBearerToken(header) {
  if (typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  return token || null;
}

module.exports = { signToken, verifyToken, extractBearerToken };
