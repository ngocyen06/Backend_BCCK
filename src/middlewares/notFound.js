// OWNER: Yến
module.exports = (req, res) =>
  res.status(404).json({ code: 'NOT_FOUND', message: 'Không tìm thấy đường dẫn' });
