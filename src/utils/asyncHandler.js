// OWNER: Yến
// Bọc handler async để lỗi (kể cả reject) chạy vào next() thay vì unhandled rejection.
// Express 5 tự bắt promise, nhưng dùng asyncHandler cho rõ ý và không phụ thuộc phiên bản.

/**
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => any} handler
 * @returns {(req: any, res: any, next: any) => Promise<void>}
 */
function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
module.exports.asyncHandler = asyncHandler;
