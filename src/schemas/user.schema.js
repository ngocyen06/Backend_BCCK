// OWNER: Hiếu
// Schema zod cho quản lý Users (CONTRACT.md:25, :43).
// Tái dùng username/email/password/fullName từ auth.schema.js để đồng bộ validate.
'use strict';

const { z } = require('zod');

const { ROLE_VALUES } = require('../constants/roles');
const {
  usernameSchema,
  emailSchema,
  passwordSchema,
  fullNameSchema,
} = require('./auth.schema');

const roleSchema = z.enum(ROLE_VALUES, {
  errorMap: () => ({ message: 'role chỉ nhận Admin, Teacher hoặc Student' }),
});

const isActiveSchema = z.boolean({ required_error: 'isActive là bắt buộc' });

// Query string isActive="true"/"false"/"1"/"0" -> boolean.
const isActiveQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  return value;
}, z.boolean().optional());

const keywordSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1, 'keyword không được rỗng').max(200, 'keyword tối đa 200 ký tự').optional(),
);

// Admin tạo user được chỉ định role (CONTRACT.md:43).
const createUserSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    fullName: fullNameSchema,
    email: emailSchema,
    role: roleSchema,
  })
  .strict();

// Cập nhật thông tin cơ bản — không cho đổi role/isActive qua route này.
const updateUserSchema = z
  .object({
    username: usernameSchema.optional(),
    password: passwordSchema.optional(),
    fullName: fullNameSchema.optional(),
    email: emailSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'Cần ít nhất một trường để cập nhật',
      });
    }
  });

const updateUserRoleSchema = z
  .object({
    role: roleSchema,
  })
  .strict();

const updateUserStatusSchema = z
  .object({
    isActive: isActiveSchema,
  })
  .strict();

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'page phải >= 1').default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'pageSize phải >= 1')
    .max(100, 'pageSize tối đa 100')
    .default(10),
  role: roleSchema.optional(),
  isActive: isActiveQuerySchema,
  keyword: keywordSchema,
});

const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive('id không hợp lệ'),
});

module.exports = {
  ROLE_VALUES,
  roleSchema,
  createUserSchema,
  updateUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  listUsersQuerySchema,
  userIdParamSchema,
};
