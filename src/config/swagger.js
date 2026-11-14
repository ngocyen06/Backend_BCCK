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
    { name: 'Statistics', description: 'Thống kê (Admin, Teacher)' },
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
      UpdateSubjectRequest: {
        type: 'object',
        minProperties: 1,
        properties: {
          code: { type: 'string', minLength: 1, maxLength: 20 },
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 1000, nullable: true },
        },
      },
      Role: { type: 'string', enum: ['Admin', 'Teacher', 'Student'] },
      ExamStatus: { type: 'string', enum: ['Draft', 'Published'] },
      AttemptStatus: { type: 'string', enum: ['InProgress', 'Submitted', 'Expired'] },
      Difficulty: {
        type: 'integer',
        enum: [1, 2, 3],
        description: '1 = EASY, 2 = MEDIUM, 3 = HARD',
      },
      RegisterRequest: {
        type: 'object',
        required: ['username', 'email', 'password', 'fullName'],
        additionalProperties: false,
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 50, example: 'sv001' },
          email: { type: 'string', format: 'email', maxLength: 150, example: 'sv001@example.com' },
          password: { type: 'string', minLength: 6, maxLength: 72, example: 'secret123' },
          fullName: { type: 'string', minLength: 1, maxLength: 100, example: 'Nguyễn Văn A' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        additionalProperties: false,
        properties: {
          username: { type: 'string', minLength: 1, example: 'sv001' },
          password: { type: 'string', minLength: 1, example: 'secret123' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOi...' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          username: { type: 'string', example: 'sv001' },
          email: { type: 'string', format: 'email', example: 'sv001@example.com' },
          fullName: { type: 'string', example: 'Nguyễn Văn A' },
          role: { $ref: '#/components/schemas/Role' },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time', nullable: true },
          updatedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      UserList: {
        allOf: [
          { $ref: '#/components/schemas/Pagination' },
          {
            type: 'object',
            properties: {
              items: { type: 'array', items: { $ref: '#/components/schemas/User' } },
            },
          },
        ],
      },
      CreateUserRequest: {
        type: 'object',
        required: ['username', 'password', 'fullName', 'email', 'role'],
        additionalProperties: false,
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 50, example: 'gv001' },
          password: { type: 'string', minLength: 6, maxLength: 72, example: 'secret123' },
          fullName: { type: 'string', minLength: 1, maxLength: 100, example: 'Trần Thị B' },
          email: { type: 'string', format: 'email', maxLength: 150, example: 'gv001@example.com' },
          role: { $ref: '#/components/schemas/Role' },
        },
      },
      UpdateUserRequest: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 50 },
          password: { type: 'string', minLength: 6, maxLength: 72 },
          fullName: { type: 'string', minLength: 1, maxLength: 100 },
          email: { type: 'string', format: 'email', maxLength: 150 },
        },
      },
      UpdateUserRoleRequest: {
        type: 'object',
        required: ['role'],
        additionalProperties: false,
        properties: { role: { $ref: '#/components/schemas/Role' } },
      },
      UpdateUserStatusRequest: {
        type: 'object',
        required: ['isActive'],
        additionalProperties: false,
        properties: { isActive: { type: 'boolean', example: true } },
      },
      QuestionOption: {
        type: 'object',
        required: ['content', 'isCorrect'],
        properties: {
          id: { type: 'integer', example: 11 },
          content: { type: 'string', minLength: 1, maxLength: 1000, example: 'Đáp án A' },
          isCorrect: { type: 'boolean', example: true },
        },
      },
      Question: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          subjectId: { type: 'integer', example: 1 },
          content: { type: 'string', example: 'Câu hỏi mẫu?' },
          difficulty: { $ref: '#/components/schemas/Difficulty' },
          explanation: { type: 'string', nullable: true },
          options: { type: 'array', items: { $ref: '#/components/schemas/QuestionOption' } },
        },
      },
      QuestionList: {
        allOf: [
          { $ref: '#/components/schemas/Pagination' },
          {
            type: 'object',
            properties: {
              items: { type: 'array', items: { $ref: '#/components/schemas/Question' } },
            },
          },
        ],
      },
      CreateQuestionRequest: {
        type: 'object',
        required: ['subjectId', 'content', 'difficulty', 'options'],
        properties: {
          subjectId: { type: 'integer', minimum: 1, example: 1 },
          content: { type: 'string', minLength: 1, maxLength: 4000 },
          difficulty: { $ref: '#/components/schemas/Difficulty' },
          explanation: { type: 'string', maxLength: 4000, nullable: true },
          options: {
            type: 'array',
            minItems: 2,
            maxItems: 10,
            items: {
              type: 'object',
              required: ['content', 'isCorrect'],
              properties: {
                content: { type: 'string', minLength: 1, maxLength: 1000 },
                isCorrect: { type: 'boolean' },
              },
            },
          },
        },
        description: 'options phải có đúng 1 đáp án isCorrect = true.',
      },
      UpdateQuestionRequest: {
        type: 'object',
        minProperties: 1,
        properties: {
          subjectId: { type: 'integer', minimum: 1 },
          content: { type: 'string', minLength: 1, maxLength: 4000 },
          difficulty: { $ref: '#/components/schemas/Difficulty' },
          explanation: { type: 'string', maxLength: 4000, nullable: true },
          options: {
            type: 'array',
            minItems: 2,
            maxItems: 10,
            items: {
              type: 'object',
              required: ['content', 'isCorrect'],
              properties: {
                content: { type: 'string', minLength: 1, maxLength: 1000 },
                isCorrect: { type: 'boolean' },
              },
            },
          },
        },
      },
      ExamSetQuestion: {
        type: 'object',
        required: ['questionId'],
        properties: {
          questionId: { type: 'integer', minimum: 1, example: 5 },
          orderNo: { type: 'integer', minimum: 1, example: 1 },
          score: { type: 'number', minimum: 0, maximum: 100, example: 1 },
        },
      },
      ExamSet: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          subjectId: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Đề giữa kỳ' },
          durationMinutes: { type: 'integer', example: 60 },
          status: { $ref: '#/components/schemas/ExamStatus' },
          createdAt: { type: 'string', format: 'date-time', nullable: true },
          updatedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      ExamSetList: {
        allOf: [
          { $ref: '#/components/schemas/Pagination' },
          {
            type: 'object',
            properties: {
              items: { type: 'array', items: { $ref: '#/components/schemas/ExamSet' } },
            },
          },
        ],
      },
      CreateExamSetRequest: {
        type: 'object',
        required: ['subjectId', 'title', 'durationMinutes'],
        properties: {
          subjectId: { type: 'integer', minimum: 1, example: 1 },
          title: { type: 'string', minLength: 1, maxLength: 255, example: 'Đề giữa kỳ' },
          durationMinutes: { type: 'integer', minimum: 1, maximum: 600, example: 60 },
          questions: {
            type: 'array',
            minItems: 1,
            maxItems: 200,
            items: { $ref: '#/components/schemas/ExamSetQuestion' },
          },
        },
      },
      UpdateExamSetRequest: {
        type: 'object',
        minProperties: 1,
        properties: {
          subjectId: { type: 'integer', minimum: 1 },
          title: { type: 'string', minLength: 1, maxLength: 255 },
          durationMinutes: { type: 'integer', minimum: 1, maximum: 600 },
          questions: {
            type: 'array',
            minItems: 1,
            maxItems: 200,
            items: { $ref: '#/components/schemas/ExamSetQuestion' },
          },
        },
      },
      AddExamSetQuestionsRequest: {
        type: 'object',
        required: ['questions'],
        properties: {
          questions: {
            type: 'array',
            minItems: 1,
            maxItems: 200,
            items: { $ref: '#/components/schemas/ExamSetQuestion' },
          },
        },
      },
      Attempt: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          examSetId: { type: 'integer', example: 1 },
          studentId: { type: 'integer', example: 3 },
          startedAt: { type: 'string', format: 'date-time', nullable: true },
          submittedAt: { type: 'string', format: 'date-time', nullable: true },
          totalScore: { type: 'number', nullable: true, example: 8.5 },
          correctCount: { type: 'integer', nullable: true, example: 17 },
          status: { $ref: '#/components/schemas/AttemptStatus' },
          durationMinutes: { type: 'integer', nullable: true, example: 60 },
          examSetTitle: { type: 'string', nullable: true },
          deadlineAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      AttemptList: {
        allOf: [
          { $ref: '#/components/schemas/Pagination' },
          {
            type: 'object',
            properties: {
              items: { type: 'array', items: { $ref: '#/components/schemas/Attempt' } },
            },
          },
        ],
      },
      StartAttemptResponse: {
        type: 'object',
        properties: {
          attempt: { $ref: '#/components/schemas/Attempt' },
          examSet: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              subjectId: { type: 'integer' },
              title: { type: 'string' },
            },
          },
          questions: { type: 'array', items: { $ref: '#/components/schemas/Question' } },
          answers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                questionId: { type: 'integer' },
                selectedOptionId: { type: 'integer', nullable: true },
              },
            },
          },
        },
      },
      TakeAttemptResponse: {
        type: 'object',
        properties: {
          attempt: { $ref: '#/components/schemas/Attempt' },
          questions: { type: 'array', items: { $ref: '#/components/schemas/Question' } },
          answers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                questionId: { type: 'integer' },
                selectedOptionId: { type: 'integer', nullable: true },
              },
            },
          },
        },
      },
      SubmitAttemptRequest: {
        type: 'object',
        required: ['answers'],
        additionalProperties: false,
        properties: {
          answers: {
            type: 'array',
            maxItems: 500,
            items: {
              type: 'object',
              required: ['questionId'],
              additionalProperties: false,
              properties: {
                questionId: { type: 'integer', minimum: 1, example: 5 },
                selectedOptionId: { type: 'integer', nullable: true, example: 12 },
              },
            },
          },
        },
      },
      AttemptResultResponse: {
        type: 'object',
        properties: {
          attempt: { $ref: '#/components/schemas/Attempt' },
          answers: { type: 'array', items: { type: 'object' } },
        },
      },
      SubjectStatisticsResponse: {
        type: 'object',
        properties: {
          subjectId: { type: 'integer', example: 1 },
          items: { type: 'array', items: { type: 'object' } },
        },
      },
      ExamSetStatisticsResponse: {
        type: 'object',
        additionalProperties: true,
        properties: { examSetId: { type: 'integer', example: 1 } },
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
  // Paths cho toàn bộ router (routes/index.js:5-15).
  paths: {
    // ---------- Auth (routes/auth.routes.js:10-13) ----------
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng ký (luôn tạo Student)',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Đăng ký thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          409: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng nhập → JWT',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Đăng nhập thành công',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Thông tin người dùng hiện tại',
        responses: {
          200: {
            description: 'Hồ sơ',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },

    // ---------- Users (routes/user.routes.js) ----------
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Danh sách người dùng (Admin)',
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/PageSize' },
          { name: 'role', in: 'query', schema: { $ref: '#/components/schemas/Role' } },
          { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
          { name: 'keyword', in: 'query', schema: { type: 'string', maxLength: 200 } },
        ],
        responses: {
          200: {
            description: 'Danh sách',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserList' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Tạo người dùng (Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateUserRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Đã tạo',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          409: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/users/{id}': {
      parameters: [{ $ref: '#/components/parameters/IdPath' }],
      get: {
        tags: ['Users'],
        summary: 'Chi tiết người dùng (Admin)',
        responses: {
          200: {
            description: 'Người dùng',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Cập nhật thông tin cơ bản (Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateUserRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Đã cập nhật',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Xoá người dùng (Admin)',
        responses: {
          204: { description: 'Đã xoá' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/users/{id}/role': {
      parameters: [{ $ref: '#/components/parameters/IdPath' }],
      patch: {
        tags: ['Users'],
        summary: 'Đổi role (Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateUserRoleRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Đã cập nhật',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/users/{id}/status': {
      parameters: [{ $ref: '#/components/parameters/IdPath' }],
      patch: {
        tags: ['Users'],
        summary: 'Khoá / mở khoá người dùng (Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateUserStatusRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Đã cập nhật',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },

    // ---------- Subjects (routes/subject.routes.js) ----------
    '/subjects': {
      get: {
        tags: ['Subjects'],
        summary: 'Danh sách môn học',
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/PageSize' },
          { name: 'keyword', in: 'query', schema: { type: 'string', maxLength: 200 } },
        ],
        responses: {
          200: {
            description: 'Danh sách',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SubjectList' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
      post: {
        tags: ['Subjects'],
        summary: 'Tạo môn học (Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateSubjectRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Đã tạo',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Subject' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          409: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/subjects/{id}': {
      parameters: [{ $ref: '#/components/parameters/IdPath' }],
      get: {
        tags: ['Subjects'],
        summary: 'Chi tiết môn học',
        responses: {
          200: {
            description: 'Môn học',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Subject' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
      patch: {
        tags: ['Subjects'],
        summary: 'Cập nhật môn học (Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateSubjectRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Đã cập nhật',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Subject' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
      delete: {
        tags: ['Subjects'],
        summary: 'Xoá môn học (Admin)',
        responses: {
          204: { description: 'Đã xoá' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },

    // ---------- Exam sets (routes/examSet.routes.js) ----------
    '/exam-sets': {
      get: {
        tags: ['Exams'],
        summary: 'Danh sách bộ đề',
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/PageSize' },
          { name: 'subjectId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/ExamStatus' } },
          { name: 'keyword', in: 'query', schema: { type: 'string', maxLength: 200 } },
        ],
        responses: {
          200: {
            description: 'Danh sách',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ExamSetList' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
      post: {
        tags: ['Exams'],
        summary: 'Tạo bộ đề (Teacher, Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateExamSetRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Đã tạo',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ExamSet' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/exam-sets/{id}': {
      parameters: [{ $ref: '#/components/parameters/IdPath' }],
      get: {
        tags: ['Exams'],
        summary: 'Chi tiết bộ đề',
        responses: {
          200: {
            description: 'Bộ đề',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ExamSet' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
      put: {
        tags: ['Exams'],
        summary: 'Cập nhật bộ đề (Teacher, Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateExamSetRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Đã cập nhật',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ExamSet' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/exam-sets/{id}/questions': {
      parameters: [{ $ref: '#/components/parameters/IdPath' }],
      post: {
        tags: ['Exams'],
        summary: 'Thêm câu hỏi vào bộ đề (Teacher, Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddExamSetQuestionsRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Bộ đề sau khi thêm',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ExamSet' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/exam-sets/{id}/questions/{questionId}': {
      parameters: [
        { $ref: '#/components/parameters/IdPath' },
        { $ref: '#/components/parameters/QuestionIdPath' },
      ],
      delete: {
        tags: ['Exams'],
        summary: 'Bỏ câu hỏi khỏi bộ đề (Teacher, Admin)',
        responses: {
          200: {
            description: 'Bộ đề sau khi bỏ',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ExamSet' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/exam-sets/{id}/publish': {
      parameters: [{ $ref: '#/components/parameters/IdPath' }],
      patch: {
        tags: ['Exams'],
        summary: 'Công bố bộ đề (Teacher, Admin)',
        responses: {
          200: {
            description: 'Bộ đề đã công bố',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ExamSet' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },

    // ---------- Questions (routes/question.routes.js) ----------
    '/questions': {
      get: {
        tags: ['Questions'],
        summary: 'Danh sách câu hỏi (Admin, Teacher)',
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/PageSize' },
          { name: 'subjectId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'difficulty', in: 'query', schema: { $ref: '#/components/schemas/Difficulty' } },
          { name: 'keyword', in: 'query', schema: { type: 'string', maxLength: 200 } },
        ],
        responses: {
          200: {
            description: 'Danh sách',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/QuestionList' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
      post: {
        tags: ['Questions'],
        summary: 'Tạo câu hỏi (Teacher, Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateQuestionRequest' } },
          },
        },
        responses: {
          201: {
            description: 'Đã tạo',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Question' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/questions/{id}': {
      parameters: [{ $ref: '#/components/parameters/IdPath' }],
      get: {
        tags: ['Questions'],
        summary: 'Chi tiết câu hỏi (Admin, Teacher)',
        responses: {
          200: {
            description: 'Câu hỏi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Question' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
      put: {
        tags: ['Questions'],
        summary: 'Cập nhật câu hỏi (Teacher, Admin)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateQuestionRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Đã cập nhật',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Question' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
      delete: {
        tags: ['Questions'],
        summary: 'Xoá mềm câu hỏi (Teacher, Admin)',
        responses: {
          204: { description: 'Đã xoá' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },

    // ---------- Attempts (routes/attempt.routes.js) ----------
    '/exam-sets/{id}/start': {
      parameters: [{ $ref: '#/components/parameters/IdPath' }],
      post: {
        tags: ['Attempts'],
        summary: 'Bắt đầu (hoặc tiếp tục) làm bài (Student)',
        responses: {
          201: {
            description: 'Lượt làm đã sẵn sàng',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/StartAttemptResponse' } },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/attempts/my': {
      get: {
        tags: ['Attempts'],
        summary: 'Lịch sử làm bài của chính mình',
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/PageSize' },
        ],
        responses: {
          200: {
            description: 'Danh sách',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AttemptList' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/attempts/{id}': {
      parameters: [{ $ref: '#/components/parameters/IdPath' }],
      get: {
        tags: ['Attempts'],
        summary: 'Xem lại đề đang làm (không trả isCorrect)',
        responses: {
          200: {
            description: 'Lượt làm',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/TakeAttemptResponse' } },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/attempts/{id}/submit': {
      parameters: [{ $ref: '#/components/parameters/IdPath' }],
      post: {
        tags: ['Attempts'],
        summary: 'Nộp bài (Student)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/SubmitAttemptRequest' } },
          },
        },
        responses: {
          200: {
            description: 'Kết quả tóm tắt',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Attempt' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/attempts/{id}/result': {
      parameters: [{ $ref: '#/components/parameters/IdPath' }],
      get: {
        tags: ['Attempts'],
        summary: 'Xem kết quả chi tiết (chủ lượt hoặc Admin)',
        responses: {
          200: {
            description: 'Kết quả',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AttemptResultResponse' } },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/BadRequest' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },

    // ---------- Statistics (routes/statistics.routes.js) ----------
    '/statistics/subjects/{subjectId}': {
      parameters: [{ $ref: '#/components/parameters/SubjectIdPath' }],
      get: {
        tags: ['Statistics'],
        summary: 'Thống kê theo môn học (Admin, Teacher)',
        responses: {
          200: {
            description: 'Thống kê',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SubjectStatisticsResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
    '/exam-sets/{id}/statistics': {
      parameters: [{ $ref: '#/components/parameters/IdPath' }],
      get: {
        tags: ['Statistics'],
        summary: 'Thống kê theo bộ đề (Admin, Teacher)',
        responses: {
          200: {
            description: 'Thống kê',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExamSetStatisticsResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          500: { $ref: '#/components/responses/Internal' },
        },
      },
    },
  },
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
