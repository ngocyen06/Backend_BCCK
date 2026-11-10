// OWNER: Yến
// Schema zod dùng chung: phân trang và tham số id (CONTRACT.md:25).

const { z } = require('zod');

const pageSchema = z.coerce.number().int().min(1).default(1);
const pageSizeSchema = z.coerce.number().int().min(1).max(100).default(10);

const paginationQuerySchema = z.object({
  page: pageSchema,
  pageSize: pageSizeSchema,
});

const idSchema = z.coerce.number().int().positive();

const idParamSchema = z.object({ id: idSchema });

// Số nguyên dương từ query (SubjectId, ExamSetId...) - coerce để nhận cả string.
const positiveIntQuery = z.coerce.number().int().positive();

module.exports = {
  z,
  pageSchema,
  pageSizeSchema,
  paginationQuerySchema,
  idSchema,
  idParamSchema,
  positiveIntQuery,
};
