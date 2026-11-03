// OWNER: Hiếu
// Mount ở '/': router.get('/statistics/subjects/:subjectId', ...), router.get('/exam-sets/:id/statistics', ...)
const router = require('express').Router();

// TODO: khai báo route ở đây, theo CONTRACT.md mục 8
// Nhớ: router.use(authenticate) ở đầu, mỗi route phải có authorize(...)

module.exports = router;
