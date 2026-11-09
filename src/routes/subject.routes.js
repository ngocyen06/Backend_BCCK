// OWNER: Hiếu
// Route quản lý môn học. Xem danh mục: mọi role đã đăng nhập;
// tạo/sửa/xoá: chỉ Admin (CONTRACT.md:44).
// Mặc định từ chối: authenticate cho cả router, mỗi route tự khai báo authorize (CONTRACT.md:41).

const express = require('express');

const subjectController = require('../controllers/subject.controller');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { ROLES } = require('../constants/roles');
const {
  createSubjectSchema,
  updateSubjectSchema,
  listSubjectsQuerySchema,
} = require('../schemas/subject.schema');

const router = express.Router();

router.use(authenticate);

// Danh sách môn học: ?page=&pageSize=&keyword=
router.get(
  '/',
  authorize(ROLES.Admin, ROLES.Teacher, ROLES.Student),
  validate({ query: listSubjectsQuerySchema }),
  subjectController.listSubjects,
);

router.get(
  '/:id',
  authorize(ROLES.Admin, ROLES.Teacher, ROLES.Student),
  subjectController.getSubjectById,
);

// Admin quản lý danh mục môn học
router.post(
  '/',
  authorize(ROLES.Admin),
  validate({ body: createSubjectSchema }),
  subjectController.createSubject,
);

router.patch(
  '/:id',
  authorize(ROLES.Admin),
  validate({ body: updateSubjectSchema }),
  subjectController.updateSubject,
);

// Xoá thành công: 204 không body (CONTRACT.md:24)
router.delete('/:id', authorize(ROLES.Admin), subjectController.deleteSubject);

module.exports = router;
