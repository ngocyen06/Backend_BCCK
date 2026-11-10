// OWNER: Yến
// Điểm duy nhất tạo response lỗi (CONTRACT.md:27). 500 không lộ chi tiết.

const AppError = require('../utils/AppError');
const { ERROR_CODES, SP_ERROR_MAP } = require('../constants/errorCodes');

const MSSQL_ERROR_MAP = {
  2627: { statusCode: 409, code: ERROR_CODES.CONFLICT },
  2601: { statusCode: 409, code: ERROR_CODES.CONFLICT },
  547: { statusCode: 409, code: ERROR_CODES.CONFLICT },
};

module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    const body = { code: err.code, message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  if (err && err.name === 'ZodError' && Array.isArray(err.issues)) {
    const details = err.issues.map((issue) => ({
      path: Array.isArray(issue.path) ? issue.path : [],
      message: issue.message,
    }));
    return res
      .status(400)
      .json({ code: ERROR_CODES.VALIDATION_ERROR, message: 'Dữ liệu không hợp lệ', details });
  }

  if (err && Number.isInteger(err.number)) {
    const spMapped = SP_ERROR_MAP[err.number];
    if (spMapped) {
      return res.status(spMapped.statusCode).json({ code: spMapped.code, message: err.message });
    }
    const dbMapped = MSSQL_ERROR_MAP[err.number];
    if (dbMapped) {
      return res.status(dbMapped.statusCode).json({ code: dbMapped.code, message: err.message });
    }
  }

  console.error('[errorHandler]', err);
  return res.status(500).json({ code: ERROR_CODES.INTERNAL, message: 'Lỗi hệ thống' });
};
