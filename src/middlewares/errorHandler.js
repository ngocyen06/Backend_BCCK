// OWNER: Yến
// STUB TẠM: Yến thay bằng bản thật (AppError, lỗi SP, zod) ở MỐC 1.
module.exports = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ code: 'INTERNAL', message: 'Lỗi hệ thống' });
};
