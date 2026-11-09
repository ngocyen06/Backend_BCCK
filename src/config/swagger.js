// OWNER: Hiếu
// Cấu hình Swagger/OpenAPI cho backend. Chỉ mô tả hợp đồng API, không chứa
// logic nghiệp vụ (CONTRACT.md:16). Định dạng response bám CONTRACT.md:24-27.

const PORT = Number(process.env.PORT) || 3000;

const errorResponse = {
  type: 'object',
  required: ['code', 'message'],
  properties: {
    code: { type: 'string', example: 'NOT_FOUND' },
    message: { type: 'string', example: 'Không tìm thấy dữ liệu' },
  },
};

const validationErrorResponse = {
  allOf: [
    { $ref: '#/components/schemas/ErrorResponse' },
    {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'VALIDATION_ERROR' },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string', example: 'body.code' },
              message: { type: 'string', example: 'Mã môn phải có ít nhất 2 ký tự' },
            },
          },
        },
      },
    },
  ],
};

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Backend BCCK API',
    version: '1.0.0',
    description:
      'Tài liệu API. Xác thực bằng header Authorization: Bearer <token>. ' +
      'Lỗi luôn do errorHandler trả về dạng { code, message }.',
  },
  servers: [
    { url: `http://localhost:${PORT}`, description: 'Máy local' },
    { url: '/', description: 'Cùng origin' },
  ],
  tags: [
    { name: 'Auth', description: 'Đăng ký, đăng nhập' },
    { name: 'Users', description: 'Quản lý người dùng (Admin)' },
    { name: 'Subjects', description: 'Môn học' },
    { name: 'Exams', description: 'Bộ đề' },
    { name: 'Questions', description: 'Câu hỏi' },
    { name: 'Attempts', description: 'Lượt làm bài' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Payload { id, role }, hết hạn theo JWT_EXPIRES_IN (mặc định 2h).',
      },
    },
    parameters: {
      Page: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', minimum: 1, default: 1 },
      },
      PageSize: {
        name: 'pageSize',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      },
      IdPath: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', minimum: 1 },
      },
    },
    schemas: {
      ErrorResponse: errorResponse,
      ValidationErrorResponse: validationErrorResponse,
      Pagination: {
        type: 'object',
        required: ['page', 'pageSize', 'total'],
        properties: {
          page: { type: 'integer', example: 1 },
          pageSize: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 57 },
        },
      },
      Subject: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          code: { type: 'string', example: 'PRJ301' },
          name: { type: 'string', example: 'Java Web' },
          description: { type: 'string', nullable: true, example: 'Môn học kỳ 5' },
        },
      },
      SubjectList: {
        allOf: [
          { $ref: '#/components/schemas/Pagination' },
          {
            type: 'object',
            properties: {
              items: { type: 'array', items: { $ref: '#/components/schemas/Subject' } },
            },
          },
        ],
      },
      CreateSubjectRequest: {
        type: 'object',
        required: ['code', 'name'],
        properties: {
          code: {
            type: 'string',
            minLength: 2,
            maxLength: 20,
            pattern: '^[A-Z0-9_]+$',
            example: 'PRJ301',
          },
          name: { type: 'string', maxLength: 100, example: 'Java Web' },
          description: { type: 'string', maxLength: 500, nullable: true },
        },
      },
      UpdateSubjectRequest: {
        type: 'object',
        minProperties: 1,
        properties: {
          code: { type: 'string', minLength: 2, maxLength: 20, pattern: '^[A-Z0-9_]+$' },
          name: { type: 'string', maxLength: 100 },
          description: { type: 'string', maxLength: 500, nullable: true },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Dữ liệu không hợp lệ',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } },
      },
      Unauthorized: {
        description: 'Thiếu hoặc sai token',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      Forbidden: {
        description: 'Không đủ quyền (403 FORBIDDEN)',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      NotFound: {
        description: 'Không tìm thấy',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
      },
      Internal: {
        description: 'Lỗi hệ thống',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { code: 'INTERNAL', message: 'Lỗi hệ thống' },
          },
        },
      },
    },
  },
  // Path khai báo dần khi routes hoàn thiện; giữ object rỗng để spec vẫn hợp lệ.
  paths: {},
};

const swaggerUiOptions = {
  explorer: true,
  customSiteTitle: 'Backend BCCK API',
  swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
};

/**
 * Gắn Swagger UI vào app Express.
 * @param {import('express').Express} app
 * @param {string} [mountPath] mặc định /api-docs
 */
function mountSwagger(app, mountPath = '/api-docs') {
  let swaggerUi;
  let swaggerUiExpress;
  try {
    swaggerUi = require('swagger-ui-express');
    swaggerUiExpress = swaggerUi;
  } catch (_error) {
    throw new Error(
      "Thiếu gói 'swagger-ui-express'. Cài bằng: npm i swagger-ui-express",
    );
  }

  app.use(mountPath, swaggerUiExpress.serve, swaggerUiExpress.setup(spec, swaggerUiOptions));
  app.get(`${mountPath}.json`, (_req, res) => res.json(spec));
  return app;
}

module.exports = { spec, swaggerUiOptions, mountSwagger };
