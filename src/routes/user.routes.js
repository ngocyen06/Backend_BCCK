// OWNER: Hiếu
// Route quản lý người dùng — chỉ Admin
// Mặc định từ chối: authenticate cho cả router, mỗi route tự khai báo authorize (CONTRACT.md:41).

const express = require('express');

const userController = require('../controllers/user.controller');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const validate = require('../middlewares/validate');
const { ROLES } = require('../constants/roles');
const {
  createUserSchema,
  updateUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  listUsersQuerySchema,
} = require('../schemas/user.schema');

const router = express.Router();

router.use(authenticate);

// Danh sách user: ?page=&pageSize=&role=&isActive=&keyword=
router.get(
  '/',
  authorize(ROLES.Admin),
  validate({ query: listUsersQuerySchema }),
  userController.listUsers,
);

router.get('/:id', authorize(ROLES.Admin), userController.getUserById);

// Admin tạo user và được phép chỉ định role (khác register công khai, CONTRACT.md:43)
router.post(
  '/',
  authorize(ROLES.Admin),
  validate({ body: createUserSchema }),
  userController.createUser,
);

router.patch(
  '/:id',
  authorize(ROLES.Admin),
  validate({ body: updateUserSchema }),
  userController.updateUser,
);

router.patch(
  '/:id/role',
  authorize(ROLES.Admin),
  validate({ body: updateUserRoleSchema }),
  userController.updateUserRole,
);

router.patch(
  '/:id/status',
  authorize(ROLES.Admin),
  validate({ body: updateUserStatusSchema }),
  userController.updateUserStatus,
);

// Xoá thành công: 204 không body (CONTRACT.md:24)
router.delete('/:id', authorize(ROLES.Admin), userController.deleteUser);

module.exports = router;
