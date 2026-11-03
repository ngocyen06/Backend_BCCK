# CONTRACT.md — Hợp đồng chung của nhóm

> **Owner: Yến.** Mọi thay đổi file này phải báo cả nhóm và được đồng ý.
> Khi nhờ AI viết code, **luôn dán kèm file này + `01_create_tables.sql`** vào prompt.

Dự án: **Quiz & Exam Practice API + AI Support** (Node.js 24, Express 5, SQL Server 2022, Gemini).

---

## 1. Phân công

| Người | Sở hữu |
|---|---|
| **Yến** | `database/01, 02, 03, 05`, `server.js`, `app.js`, `config/env.js`, `config/db.js`, `constants/`, `utils/` (trừ `withTimeout.js`), `middlewares/`, **Auth**, **Attempt** |
| **Khôi** | **Question**, **ExamSet**, câu hỏi mẫu |
| **Hiếu** | **Subject**, **User (Admin)**, **AI** (`ai.service`, `aiExplanation.repository`, `gemini.js`, `withTimeout.js`), **Thống kê** (kèm `04_sp`), Swagger, tests, README |

Quy tắc: **chỉ sửa file có dòng `// OWNER:` là mình.** Cần sửa file người khác thì nhắn người đó.

---

## 2. Quy ước đặt tên

| Thứ | Quy ước | Ví dụ |
|---|---|---|
| Bảng, cột DB | `PascalCase` | `ExamAttempt`, `StartedAt` |
| Bảng người dùng | tên là **`Users`** (vì `User` là từ khóa SQL) | `dbo.Users` |
| Field JSON (request/response) | `camelCase` | `selectedOptionId` |
| File code | `ten.layer.js` | `question.service.js` |
| Hằng số | `UPPER_SNAKE_CASE` | `ATTEMPT_ALREADY_IN_PROGRESS` |
| Repository | **chuyển PascalCase → camelCase** trước khi trả lên service | `row.ExamSetId` → `examSetId` |
| Thời gian | luôn **UTC**, định dạng ISO 8601 | `2026-11-03T08:30:00.000Z` |
| Tham số truy vấn | **luôn dùng `.input()`**, cấm nối chuỗi SQL | |

---

## 3. Kiến trúc tầng (chỉ phụ thuộc đi xuống)

```
routes → controllers → services → repositories → Database
```

| Tầng | Được | Không được |
|---|---|---|
| Route | Khai báo đường dẫn, gắn `authenticate`, `authorize`, `validate` | Chứa logic |
| Controller | Đọc `req`, gọi service, trả `res` | Có SQL hoặc `if` nghiệp vụ |
| Service | Quy tắc nghiệp vụ, ném `AppError` | Dùng `req`/`res`, viết SQL |
| Repository | Chỉ SQL (`mssql`) | Quyết định nghiệp vụ |

Controller luôn lấy `studentId` / `teacherId` từ **`req.user.id`**, **không bao giờ từ body**.

---

## 4. Định dạng response

### 4.1 Thành công

- Một đối tượng: trả thẳng đối tượng (`{ "id": 1, ... }`).
- Tạo mới: HTTP `201`. Còn lại: `200`. Xóa thành công: `204` (không body).

### 4.2 Danh sách có phân trang

```json
{ "items": [ ... ], "page": 1, "pageSize": 10, "total": 57 }
```

Query: `?page=1&pageSize=10` (mặc định `page=1`, `pageSize=10`, **tối đa `pageSize=100`**).

### 4.3 Lỗi (mọi lỗi đều theo đúng dạng này)

```json
{ "code": "EXAM_NOT_PUBLISHED", "message": "Bộ đề chưa được xuất bản" }
```

Lỗi validate (zod) có thêm `details`:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ",
  "details": [ { "path": "options", "message": "Phải có đúng 1 đáp án đúng" } ]
}
```

Service ném `new AppError(statusCode, code, message)`. Chỉ `errorHandler.js` mới tạo response lỗi.
Lỗi 500 **không** lộ chi tiết (chỉ `INTERNAL` + "Lỗi hệ thống").

---

## 5. Mã lỗi (`constants/errorCodes.js`)

| HTTP | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | zod không qua |
| 400 | `EXAM_EMPTY` | publish đề không có câu hỏi |
| 401 | `UNAUTHENTICATED` | thiếu / sai / hết hạn token |
| 401 | `INVALID_CREDENTIALS` | sai username hoặc mật khẩu (**không** nói sai cái nào) |
| 403 | `FORBIDDEN` | sai role |
| 403 | `ACCOUNT_LOCKED` | tài khoản `IsActive = 0` |
| 404 | `NOT_FOUND` | không tìm thấy (chung) |
| 404 | `USER_NOT_FOUND`, `SUBJECT_NOT_FOUND`, `QUESTION_NOT_FOUND`, `EXAM_NOT_FOUND`, `ATTEMPT_NOT_FOUND` | tài nguyên không tồn tại **hoặc không phải của bạn** |
| 409 | `USERNAME_TAKEN`, `EMAIL_TAKEN`, `SUBJECT_CODE_TAKEN` | trùng dữ liệu duy nhất |
| 409 | `SUBJECT_HAS_QUESTIONS` | xóa môn đang có câu hỏi |
| 409 | `EXAM_HAS_ATTEMPTS` | sửa đề đã có người làm |
| 409 | `EXAM_NOT_PUBLISHED` | sinh viên làm đề Draft |
| 409 | `ATTEMPT_ALREADY_IN_PROGRESS` | đã có lượt InProgress trên đề này |
| 409 | `ATTEMPT_NOT_IN_PROGRESS` | nộp lượt đã Submitted/Expired |
| 409 | `ATTEMPT_EXPIRED` | nộp quá hạn |
| 409 | `CANNOT_LOCK_SELF` | Admin tự khóa mình |
| 500 | `INTERNAL` | lỗi hệ thống |

**Quy tắc 404 thay vì 403 cho dữ liệu của người khác:** Student xem attempt của người khác, Teacher sửa câu hỏi/đề của Teacher khác → trả `404` để không lộ sự tồn tại.

---

## 6. Xác thực và phân quyền (RBAC)

### 6.1 JWT

- Header: `Authorization: Bearer <token>`
- Payload: `{ "id": 1, "role": "Teacher" }`, hết hạn theo `JWT_EXPIRES_IN` (mặc định `2h`).
- `authenticate` kiểm tra token, **đọc lại `IsActive` từ DB**, rồi gán `req.user = { id, role }`.
- `authorize(...roles)` trả `403 FORBIDDEN` nếu role không nằm trong danh sách.

### 6.2 Ba lớp kiểm soát

| Lớp | Câu hỏi | Nơi cài |
|---|---|---|
| 1. Xác thực | Bạn là ai? | `authenticate.js` |
| 2. Role | Role này được gọi API này không? | `authorize.js` ở `routes/` |
| 3. Ownership | Dữ liệu này có phải của bạn không? | `services/` và SP |

Mặc định từ chối: mỗi file route bắt đầu bằng `router.use(authenticate)`, **mỗi route phải khai báo `authorize(...)`**.

### 6.3 Ma trận quyền

| Chức năng | Admin | Teacher | Student |
|---|:-:|:-:|:-:|
| Quản lý user, khóa/mở, đổi role | ✅ | ❌ | ❌ |
| Quản lý môn học (CUD) | ✅ | ❌ | ❌ |
| Xem danh sách môn học | ✅ | ✅ | ✅ |
| CRUD câu hỏi | ❌ | ✅ (của mình) | ❌ |
| CRUD bộ đề, publish | ❌ | ✅ (của mình) | ❌ |
| Xem đề Published | ❌ | ✅ | ✅ |
| Bắt đầu / nộp bài | ❌ | ❌ | ✅ |
| Xem kết quả, lịch sử, thống kê cá nhân | ❌ | ❌ | ✅ (của mình) |
| Thống kê theo bộ đề | ❌ | ✅ (của mình) | ❌ |

`POST /auth/register` công khai **luôn tạo Student**, **không** nhận field `role`. Admin tạo Teacher qua `POST /users`.

---

## 7. Hằng số (`constants/`)

```js
// roles.js
ROLES = { ADMIN: 'Admin', TEACHER: 'Teacher', STUDENT: 'Student' }

// status.js
EXAM_STATUS    = { DRAFT: 'Draft', PUBLISHED: 'Published' }
ATTEMPT_STATUS = { IN_PROGRESS: 'InProgress', SUBMITTED: 'Submitted', EXPIRED: 'Expired' }

// Độ khó câu hỏi
DIFFICULTY = { EASY: 1, MEDIUM: 2, HARD: 3 }
```

---

## 8. Danh sách API

Tất cả có tiền tố `/api`.

### 8.1 Auth (`auth.*`, Yến)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | Public | Đăng ký Student |
| POST | `/auth/login` | Public | Đăng nhập, trả token |
| GET | `/auth/me` | Mọi role | Thông tin người đang đăng nhập |
| GET | `/health` | Public | `{ ok: true, db: true }` |

### 8.2 User & Subject (Hiếu)

| Method | Path | Role |
|---|---|---|
| GET | `/users?role=&keyword=&page=&pageSize=` | Admin |
| POST | `/users` (tạo Teacher/Admin/Student) | Admin |
| PATCH | `/users/:id/lock` body `{ "isActive": false }` | Admin |
| PATCH | `/users/:id/role` body `{ "role": "Teacher" }` | Admin |
| GET | `/subjects` | Mọi role |
| POST, PUT, DELETE | `/subjects`, `/subjects/:id` | Admin |

### 8.3 Question (Khôi)

| Method | Path | Role |
|---|---|---|
| GET | `/questions?subjectId=&difficulty=&keyword=&page=&pageSize=` | Teacher |
| GET | `/questions/:id` | Teacher (của mình) |
| POST | `/questions` | Teacher |
| PUT | `/questions/:id` | Teacher (của mình) |
| DELETE | `/questions/:id` (xóa mềm) | Teacher (của mình) |

### 8.4 ExamSet (Khôi)

| Method | Path | Role |
|---|---|---|
| POST | `/exam-sets` | Teacher |
| GET | `/exam-sets` | Teacher: đề của mình (mọi trạng thái). Student: chỉ đề **Published** |
| GET | `/exam-sets/:id` | Teacher (của mình) |
| PUT | `/exam-sets/:id` | Teacher (của mình, chưa có người làm) |
| POST | `/exam-sets/:id/questions` | Teacher (của mình, chưa có người làm) |
| DELETE | `/exam-sets/:id/questions/:questionId` | Teacher (của mình, chưa có người làm) |
| PATCH | `/exam-sets/:id/publish` | Teacher (của mình) |

### 8.5 Attempt (Yến)

| Method | Path | Role |
|---|---|---|
| POST | `/exam-sets/:id/start` | Student |
| POST | `/attempts/:id/submit` | Student |
| GET | `/attempts/history?page=&pageSize=` | Student |
| GET | `/attempts/:id/result` | Student (của mình) |

### 8.6 Thống kê (Hiếu)

| Method | Path | Role |
|---|---|---|
| GET | `/statistics/subjects/:subjectId` | Student (của mình) |
| GET | `/exam-sets/:id/statistics` | Teacher (của mình) |

---

## 9. Hợp đồng hàm Service

Ký hiệu: `({ ... })` là một object tham số. Trả về luôn là object/array thuần camelCase.

### 9.1 `auth.service` (Yến)

```js
register({ username, password, fullName, email })
  → { id, username, fullName, email, role: 'Student' }

login({ username, password })
  → { token, user: { id, username, fullName, role } }

me({ userId })
  → { id, username, fullName, email, role }
```

### 9.2 `user.service` (Hiếu)

```js
list({ role, keyword, page, pageSize })      → { items: [User], page, pageSize, total }
create({ username, password, fullName, email, role }) → User
setActive({ actorId, userId, isActive })     // ném CANNOT_LOCK_SELF nếu actorId === userId
  → User
setRole({ actorId, userId, role })           → User
// User = { id, username, fullName, email, role, isActive, createdAt }   (KHÔNG có passwordHash)
```

### 9.3 `subject.service` (Hiếu)

```js
list()                                  → [Subject]
create({ code, name, description })     → Subject
update({ id, code, name, description }) → Subject
remove({ id })                          // ném SUBJECT_HAS_QUESTIONS nếu đã có câu hỏi
// Subject = { id, code, name, description }
```

### 9.4 `question.service` (Khôi)

```js
create({ teacherId, subjectId, content, difficulty, explanation, options: [{ content, isCorrect }] })
  → Question

list({ teacherId, subjectId, difficulty, keyword, page, pageSize })
  → { items: [QuestionSummary], page, pageSize, total }

getById({ teacherId, id })   → Question
update({ teacherId, id, ...fields, options })  → Question   // thay toàn bộ options trong 1 transaction
remove({ teacherId, id })    // xóa mềm: IsDeleted = 1

// Question = { id, subjectId, content, difficulty, explanation, createdBy, createdAt,
//              options: [{ id, content, isCorrect }] }
// QuestionSummary = Question bỏ options, thêm optionCount
```

Quy tắc: tạo `Question` + `QuestionOption` **trong 1 transaction** (`withTransaction`). Có đúng 1 option `isCorrect = true`, 2–6 option.

### 9.5 `examSet.service` (Khôi)

```js
create({ teacherId, subjectId, title, durationMinutes })   → ExamSet   // status = 'Draft'
list({ actor: { id, role }, subjectId, page, pageSize })
  → { items: [ExamSetSummary], page, pageSize, total }
  // Student: chỉ Published. Teacher: của mình.
getById({ teacherId, id })  → ExamSetDetail
update({ teacherId, id, title, durationMinutes })          → ExamSet
addQuestion({ teacherId, examSetId, questionId, score, orderNo })  → ExamSetDetail
removeQuestion({ teacherId, examSetId, questionId })       → ExamSetDetail
publish({ teacherId, id })  // ném EXAM_EMPTY nếu không có câu hỏi
  → ExamSet

// ExamSet = { id, subjectId, title, durationMinutes, status, createdBy, createdAt, publishedAt }
// ExamSetSummary = ExamSet + { questionCount, totalScore }
// ExamSetDetail = ExamSet + { questions: [{ questionId, orderNo, score, content, difficulty,
//                                           options: [{ id, content, isCorrect }] }] }
```

Quy tắc: `update`, `addQuestion`, `removeQuestion` ném `EXAM_HAS_ATTEMPTS` nếu `ExamAttempt` đã có dòng cho đề này. `addQuestion` chỉ nhận câu `IsDeleted = 0` và cùng `subjectId` với đề.

### 9.6 `attempt.service` (Yến)

```js
start({ examSetId, studentId })
  → {
      attemptId, examSetId, title, durationMinutes,
      startedAt, endsAt,                        // endsAt = startedAt + durationMinutes
      questions: [{
        questionId, orderNo, content, score,
        options: [{ id, content }]              // TUYỆT ĐỐI KHÔNG có isCorrect
      }]
    }

submit({ attemptId, studentId, answers: [{ questionId, selectedOptionId }] })
  → AttemptResult

getResult({ attemptId, studentId })  → AttemptResult   // 404 nếu không phải của mình
getHistory({ studentId, page, pageSize })
  → { items: [{ attemptId, examSetId, examTitle, subjectName, startedAt, submittedAt,
                totalScore, correctCount, status }], page, pageSize, total }

// AttemptResult = {
//   attemptId, examSetId, status, totalScore, maxScore, correctCount, totalQuestions,
//   submittedAt,
//   details: [{
//     questionId, orderNo, content, selectedOptionId,        // null nếu bỏ trống
//     correctOptionId, isCorrect, scoreAwarded,
//     options: [{ id, content, isCorrect }],
//     teacherExplanation,      // Question.Explanation, có thể null
//     aiExplanation            // chỉ có ở câu sai; null nếu AI lỗi / câu đúng
//   }]
// }
```

Quy tắc:
- `start`: đề phải `Published` (`EXAM_NOT_PUBLISHED`), chưa có lượt InProgress (`ATTEMPT_ALREADY_IN_PROGRESS`).
- `submit`: **COMMIT chấm điểm xong rồi mới gọi AI**. Không bao giờ gọi Gemini bên trong transaction.
- `submit` quá hạn: SP đặt `Expired` và `submit` ném `ATTEMPT_EXPIRED`.
- `getResult` cho lượt `InProgress` → ném `ATTEMPT_NOT_IN_PROGRESS` (chưa có kết quả).

### 9.7 `ai.service` (Hiếu)

```js
explainWrongQuestions([{ questionId, content, correctAnswer }])
  → Promise<Map<number, string>>      // key = questionId, value = lời giải ngắn
```

Hợp đồng bắt buộc:
1. **Không bao giờ ném lỗi** ra ngoài. Lỗi Gemini (hết quota, timeout, sai key) → bỏ qua câu đó.
2. Cache-first: tra `AiExplanation` theo `QuestionId` (1 query cho tất cả), chỉ gọi Gemini cho câu chưa có.
3. Dùng `Promise.allSettled` + `withTimeout(promise, env.GEMINI_TIMEOUT_MS)`.
4. Lời giải dưới ~80 từ, tiếng Việt.
5. Câu không có lời giải thì **không có trong Map** → `attempt.service` gán `aiExplanation: null`.

Trong lúc Hiếu chưa xong, Yến dùng bản giả: `explainWrongQuestions = async () => new Map()`.

### 9.8 `statistics.service` (Hiếu)

```js
getSubjectStatistics({ studentId, subjectId })
  → {
      subjectId, subjectName,
      attemptCount, averageScore,
      topWrongQuestions: [{ questionId, content, wrongCount, attemptCount }]
    }

getExamSetStatistics({ teacherId, examSetId })
  → {
      examSetId, title, attemptCount, averageScore,
      questions: [{ questionId, orderNo, content, wrongCount, totalAnswered, wrongRate }]
    }
```

---

## 10. Hợp đồng Stored Procedure

### `sp_SubmitAndGradeAttempt(@AttemptId INT, @StudentId INT, @AnswersJson NVARCHAR(MAX))` (Yến)

`@AnswersJson`: `[{"questionId":1,"selectedOptionId":3}, ...]`

Toàn bộ chạy trong **1 transaction**; lỗi bất kỳ → `ROLLBACK` + `THROW`.

| Bước | Quy tắc |
|---|---|
| 1 | Lượt phải thuộc `@StudentId`, `Status = 'InProgress'`, chưa quá hạn (so với `SYSUTCDATETIME()`) |
| 2 | Đối chiếu `QuestionOption.IsCorrect`, và option phải thuộc đúng câu (`o.QuestionId = esq.QuestionId`) |
| 3 | Ghi **1 dòng `AttemptAnswer` cho mỗi câu của đề**, kể cả câu bỏ trống (tính sai) |
| 4 | Cập nhật `ExamAttempt`: `TotalScore`, `CorrectCount`, `SubmittedAt`, `Status = 'Submitted'` |

Kết quả trả ra và mã lỗi:

| Tình huống | SP làm gì | `attempt.service` ánh xạ |
|---|---|---|
| Thành công | `SELECT 'Submitted' AS Result` | trả `AttemptResult` |
| Quá hạn | đặt `Expired`, COMMIT, `SELECT 'Expired' AS Result` | `409 ATTEMPT_EXPIRED` |
| Không có lượt / không phải của mình | `THROW 50001` | `404 ATTEMPT_NOT_FOUND` |
| Lượt không còn InProgress | `THROW 50002` | `409 ATTEMPT_NOT_IN_PROGRESS` |
| `@AnswersJson` không hợp lệ | `THROW 50003` | `400 VALIDATION_ERROR` |

### `sp_GetSubjectStatistics(@StudentId INT, @SubjectId INT)` (Hiếu)

Trả **2 result set**:
1. `AttemptCount`, `AverageScore` (chỉ tính lượt `Submitted`).
2. Top câu hay sai: `QuestionId`, `Content`, `WrongCount`, `AttemptCount` (sắp xếp giảm dần theo `WrongCount`, lấy 10).

---

## 11. Biến môi trường (`.env.example`)

```
PORT=3000
NODE_ENV=development

DB_SERVER=localhost
DB_PORT=1433
DB_NAME=QuizExamDb
DB_USER=
DB_PASSWORD=

JWT_SECRET=
JWT_EXPIRES_IN=2h

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_MS=8000

EXAM_GRACE_SECONDS=60
BCRYPT_ROUNDS=10
```

`env.js` kiểm tra biến bắt buộc khi khởi động; thiếu thì dừng ngay. Các file khác **chỉ đọc qua `env.js`**, không đọc `process.env` trực tiếp. **Không commit `.env`.**

---

## 12. Tài khoản seed (`05_seed_data.sql`)

| Role | Username | Mật khẩu | Email |
|---|---|---|---|
| Admin | `admin` | `Admin@123` | admin@quiz.local |
| Teacher | `teacher1` | `Teacher@123` | teacher1@quiz.local |
| Teacher | `teacher2` | `Teacher@123` | teacher2@quiz.local |
| Student | `student1` | `Student@123` | student1@quiz.local |
| Student | `student2` | `Student@123` | student2@quiz.local |

Môn học seed: `HCM202` (Tư tưởng Hồ Chí Minh), `NET101` (Mạng máy tính).
(Chỉ dùng khi phát triển, đổi mật khẩu nếu triển khai thật.)

---

## 13. Quy tắc nghiệp vụ cốt lõi (mọi người phải tuân thủ)

1. Mỗi sinh viên chỉ có **1 lượt InProgress** trên 1 bộ đề (kiểm tra ở service **và** unique index ở DB).
2. Sinh viên chỉ thấy bộ đề **Published**.
3. **Không sửa** bộ đề đã có người làm (`EXAM_HAS_ATTEMPTS`).
4. Nộp trễ quá hạn → lượt chuyển `Expired`. Giờ dùng là **giờ server (UTC)**, không tin giờ client.
5. Khi đang làm bài, response **không có `isCorrect`**.
6. Điểm **do SP tính**; client **không** gửi điểm, **không** gửi `studentId`.
7. Câu hỏi chỉ **xóa mềm** (`IsDeleted = 1`). Mọi truy vấn hiển thị phải lọc `IsDeleted = 0`.
8. Gemini lỗi **không** làm hỏng kết quả chấm điểm.
9. Lời giải AI cache theo `QuestionId`, câu đã cache **không** gọi lại Gemini.

---

## 14. Quy trình Git

- `main` luôn chạy được, **không push thẳng**, chỉ merge qua Pull Request (≥ 1 người review).
- Nhánh: `feat/yen-core`, `feat/khoi-question-exam`, `feat/hieu-admin-ai`.
- Commit: `feat(question): add list with pagination`, `fix(auth): reject locked user`.
- Mỗi sáng: `git pull origin main`, rồi `git merge main` vào nhánh của mình.
- Đổi cấu trúc bảng: **sửa file `.sql` trong repo**, nhắn nhóm, mọi người chạy lại. Không sửa bảng bằng giao diện SSMS rồi quên cập nhật file.
- Khi xong một mốc, nhắn nhóm đúng một câu: *"MỐC X xong, pull main nhé."*
- Review chéo: Khôi review Yến, Hiếu review Khôi, Yến review Hiếu.

---

## 15. Mốc merge

| Mốc | Người | Nội dung | Ai đang chờ |
|---|---|---|---|
| 1 | Yến | SQL 01/02 + `env`, `db`, `AppError`, `errorHandler`, `jwt`, `authenticate`, `authorize`, `validate` | Khôi, Hiếu |
| 2 | Yến | Auth + `05_seed_data.sql` | Khôi, Hiếu (có token thật) |
| 3 | Hiếu | `ai.service` | Yến nối vào `submit` |
| 4 | Khôi | ExamSet publish được | Yến có đề thật để `start`/`submit` |
| 5 | Yến | `submit` + `result` + AI | Hiếu test thống kê bằng dữ liệu thật |
| 6 | Cả nhóm | Chạy end-to-end, Swagger, README | |

Trước khi có mốc: dùng **token cố định**, **đề seed tay**, **hàm AI giả** để không phải chờ nhau.
