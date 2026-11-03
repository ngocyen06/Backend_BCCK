// OWNER: Yến
// Mount ở '/': tự viết đường dẫn đầy đủ, ví dụ router.post('/exam-sets/:id/start', ...), router.post('/attempts/:id/submit', ...)
const router = require('express').Router();

// TODO: khai báo route ở đây, theo CONTRACT.md mục 8
// Nhớ: router.use(authenticate) ở đầu, mỗi route phải có authorize(...)

module.exports = router;
