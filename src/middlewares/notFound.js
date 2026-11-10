// OWNER: Yến
// Route không khớp -> 404 { code, message } (CONTRACT.md:26).

const { ERROR_CODES } = require('../constants/errorCodes');

module.exports = (req, res) =>
  res.status(404).json({ code: ERROR_CODES.NOT_FOUND, message: 'Không tìm thấy đường dẫn' });
