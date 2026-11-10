// OWNER: Yến
// Schema cho /auth/register và /auth/login. Register KHÔNG nhận role từ client (CONTRACT.md:43).

const { z } = require('zod');

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username phải có ít nhất 3 ký tự')
  .max(50, 'Username tối đa 50 ký tự')
  .regex(/^[A-Za-z0-9_.-]+$/, 'Username chỉ gồm chữ, số, gạch dưới, gạch ngang và dấu chấm');

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email không được rỗng')
  .max(150, 'Email tối đa 150 ký tự')
  .email('Email không hợp lệ');

const passwordSchema = z
  .string()
  .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự');

const fullNameSchema = z
  .string()
  .trim()
  .min(1, 'Họ tên không được rỗng')
  .max(100, 'Họ tên tối đa 100 ký tự');

const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    fullName: fullNameSchema,
  })
  .strict();

const loginSchema = z
  .object({
    username: z.string().trim().min(1, 'Username không được rỗng'),
    password: z.string().min(1, 'Mật khẩu không được rỗng'),
  })
  .strict();

module.exports = {
  registerSchema,
  loginSchema,
  usernameSchema,
  emailSchema,
  passwordSchema,
  fullNameSchema,
};
