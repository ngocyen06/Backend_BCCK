// OWNER: Yến
// Đã mount SẴN mọi router. Khôi và Hiếu KHÔNG cần sửa file này.
const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/subjects', require('./subject.routes'));
router.use('/questions', require('./question.routes'));
router.use('/exam-sets', require('./examSet.routes'));

// Hai router dưới mount ở '/', tự khai báo đường dẫn đầy đủ bên trong:
//  - attempt.routes    : POST /exam-sets/:id/start, POST /attempts/:id/submit, GET /attempts/...
//  - statistics.routes : GET /statistics/subjects/:subjectId, GET /exam-sets/:id/statistics
router.use('/', require('./attempt.routes'));
router.use('/', require('./statistics.routes'));

module.exports = router;
