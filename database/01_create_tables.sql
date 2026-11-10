--  OWNER: Yến
/* =====================================================================
   01_create_tables.sql
   Hệ thống Trắc nghiệm Ôn thi & Tự động Chấm điểm
   SQL Server 2022 Express

   Thứ tự chạy:  01 -> 02 -> 03 -> 04 -> 05
   File này: tạo database + 9 bảng + khóa chính + khóa ngoại + giá trị mặc định.
   CHECK / UNIQUE / INDEX nằm ở file 02_constraints_indexes.sql.

   CẢNH BÁO: script này XÓA các bảng cũ rồi tạo lại (dùng cho môi trường dev).
   Chạy lại sẽ mất toàn bộ dữ liệu. KHÔNG chạy trên dữ liệu thật.
   ===================================================================== */

-- ---------------------------------------------------------------------
-- 0. Tạo database (nếu chưa có)
-- ---------------------------------------------------------------------
IF DB_ID(N'QuizExamDb') IS NULL
BEGIN
    CREATE DATABASE QuizExamDb COLLATE Vietnamese_100_CI_AS;
END
GO

USE QuizExamDb;
GO

-- ---------------------------------------------------------------------
-- 1. Xóa bảng cũ (theo thứ tự ngược của khóa ngoại: con trước, cha sau)
-- ---------------------------------------------------------------------
IF OBJECT_ID(N'dbo.AiExplanation',   N'U') IS NOT NULL DROP TABLE dbo.AiExplanation;
IF OBJECT_ID(N'dbo.AttemptAnswer',   N'U') IS NOT NULL DROP TABLE dbo.AttemptAnswer;
IF OBJECT_ID(N'dbo.ExamAttempt',     N'U') IS NOT NULL DROP TABLE dbo.ExamAttempt;
IF OBJECT_ID(N'dbo.ExamSetQuestion', N'U') IS NOT NULL DROP TABLE dbo.ExamSetQuestion;
IF OBJECT_ID(N'dbo.ExamSet',         N'U') IS NOT NULL DROP TABLE dbo.ExamSet;
IF OBJECT_ID(N'dbo.QuestionOption',  N'U') IS NOT NULL DROP TABLE dbo.QuestionOption;
IF OBJECT_ID(N'dbo.Question',        N'U') IS NOT NULL DROP TABLE dbo.Question;
IF OBJECT_ID(N'dbo.Subject',         N'U') IS NOT NULL DROP TABLE dbo.Subject;
IF OBJECT_ID(N'dbo.Users',           N'U') IS NOT NULL DROP TABLE dbo.Users;
GO

-- ---------------------------------------------------------------------
-- 2. Users
--    Lưu ý: đặt tên "Users" (số nhiều) vì USER là từ khóa dành riêng của SQL Server.
--    Role: 'Admin' | 'Teacher' | 'Student'  (ràng buộc CHECK ở file 02)
-- ---------------------------------------------------------------------
CREATE TABLE dbo.Users (
    Id            INT IDENTITY(1,1)  NOT NULL,
    Username      NVARCHAR(50)       NOT NULL,   -- UNIQUE ở file 02
    PasswordHash  NVARCHAR(255)      NOT NULL,   -- bcrypt hash, KHÔNG lưu mật khẩu gốc
    FullName      NVARCHAR(100)      NOT NULL,
    Email         NVARCHAR(150)      NOT NULL,   -- UNIQUE ở file 02
    Role          NVARCHAR(20)       NOT NULL,
    IsActive      BIT                NOT NULL CONSTRAINT DF_Users_IsActive  DEFAULT (1),
    CreatedAt     DATETIME2(0)       NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Users PRIMARY KEY (Id)
);
GO

-- ---------------------------------------------------------------------
-- 3. Subject (môn học)
-- ---------------------------------------------------------------------
CREATE TABLE dbo.Subject (
    Id          INT IDENTITY(1,1)  NOT NULL,
    Code        NVARCHAR(20)       NOT NULL,     -- UNIQUE ở file 02, ví dụ 'HCM202', 'NET101'
    Name        NVARCHAR(200)      NOT NULL,
    Description NVARCHAR(500)      NULL,
    CreatedAt   DATETIME2(0)       NOT NULL CONSTRAINT DF_Subject_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Subject PRIMARY KEY (Id)
);
GO

-- ---------------------------------------------------------------------
-- 4. Question (ngân hàng câu hỏi)
--    Difficulty: 1 = Dễ, 2 = Trung bình, 3 = Khó (CHECK ở file 02)
--    IsDeleted : xóa mềm. KHÔNG xóa cứng vì câu hỏi có thể nằm trong bài thi cũ.
--    Explanation: lời giải do giảng viên soạn (khác với AiExplanation do AI sinh)
-- ---------------------------------------------------------------------
CREATE TABLE dbo.Question (
    Id          INT IDENTITY(1,1)  NOT NULL,
    SubjectId   INT                NOT NULL,
    Content     NVARCHAR(MAX)      NOT NULL,
    Difficulty  TINYINT            NOT NULL CONSTRAINT DF_Question_Difficulty DEFAULT (1),
    Explanation NVARCHAR(MAX)      NULL,
    CreatedBy   INT                NOT NULL,
    IsDeleted   BIT                NOT NULL CONSTRAINT DF_Question_IsDeleted  DEFAULT (0),
    CreatedAt   DATETIME2(0)       NOT NULL CONSTRAINT DF_Question_CreatedAt  DEFAULT (SYSUTCDATETIME()),
    UpdatedAt   DATETIME2(0)       NULL,
    CONSTRAINT PK_Question           PRIMARY KEY (Id),
    CONSTRAINT FK_Question_Subject   FOREIGN KEY (SubjectId) REFERENCES dbo.Subject (Id),
    CONSTRAINT FK_Question_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users (Id)
);
GO

-- ---------------------------------------------------------------------
-- 5. QuestionOption (đáp án A/B/C/D của câu hỏi)
--    Mỗi câu có 2-6 option và ĐÚNG 1 option IsCorrect = 1
--    (đúng 1 đáp án đúng: kiểm bằng zod + service, và unique index lọc ở file 02)
-- ---------------------------------------------------------------------
CREATE TABLE dbo.QuestionOption (
    Id          INT IDENTITY(1,1)  NOT NULL,
    QuestionId  INT                NOT NULL,
    Content     NVARCHAR(1000)     NOT NULL,
    IsCorrect   BIT                NOT NULL CONSTRAINT DF_QuestionOption_IsCorrect DEFAULT (0),
    CONSTRAINT PK_QuestionOption          PRIMARY KEY (Id),
    CONSTRAINT FK_QuestionOption_Question FOREIGN KEY (QuestionId) REFERENCES dbo.Question (Id)
);
GO

-- ---------------------------------------------------------------------
-- 6. ExamSet (bộ đề)
--    Status: 'Draft' | 'Published'  (CHECK ở file 02)
-- ---------------------------------------------------------------------
CREATE TABLE dbo.ExamSet (
    Id               INT IDENTITY(1,1)  NOT NULL,
    SubjectId        INT                NOT NULL,
    Title            NVARCHAR(200)      NOT NULL,
    DurationMinutes  INT                NOT NULL,   -- CHECK > 0 ở file 02
    Status           NVARCHAR(20)       NOT NULL CONSTRAINT DF_ExamSet_Status    DEFAULT (N'Draft'),
    CreatedBy        INT                NOT NULL,
    CreatedAt        DATETIME2(0)       NOT NULL CONSTRAINT DF_ExamSet_CreatedAt DEFAULT (SYSUTCDATETIME()),
    PublishedAt      DATETIME2(0)       NULL,
    CONSTRAINT PK_ExamSet           PRIMARY KEY (Id),
    CONSTRAINT FK_ExamSet_Subject   FOREIGN KEY (SubjectId) REFERENCES dbo.Subject (Id),
    CONSTRAINT FK_ExamSet_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users (Id)
);
GO

-- ---------------------------------------------------------------------
-- 7. ExamSetQuestion (bảng nối nhiều-nhiều: bộ đề <-> câu hỏi)
--    Khóa chính ghép (ExamSetId, QuestionId): 1 câu chỉ xuất hiện 1 lần trong 1 bộ đề.
--    Xóa bộ đề (Draft) thì tự xóa các dòng nối (ON DELETE CASCADE).
-- ---------------------------------------------------------------------
CREATE TABLE dbo.ExamSetQuestion (
    ExamSetId   INT            NOT NULL,
    QuestionId  INT            NOT NULL,
    OrderNo     INT            NOT NULL,            -- thứ tự câu trong đề, UNIQUE theo đề ở file 02
    Score       DECIMAL(5,2)   NOT NULL CONSTRAINT DF_ExamSetQuestion_Score DEFAULT (1),
    CONSTRAINT PK_ExamSetQuestion          PRIMARY KEY (ExamSetId, QuestionId),
    CONSTRAINT FK_ExamSetQuestion_ExamSet  FOREIGN KEY (ExamSetId)  REFERENCES dbo.ExamSet (Id) ON DELETE CASCADE,
    CONSTRAINT FK_ExamSetQuestion_Question FOREIGN KEY (QuestionId) REFERENCES dbo.Question (Id)
);
GO

-- ---------------------------------------------------------------------
-- 8. ExamAttempt (một lượt làm bài của sinh viên)
--    Status: 'InProgress' | 'Submitted' | 'Expired'  (CHECK ở file 02)
--    TotalScore, CorrectCount, SubmittedAt = NULL cho tới khi nộp bài.
--    Giờ luôn là UTC (SYSUTCDATETIME), hạn nộp = StartedAt + DurationMinutes.
-- ---------------------------------------------------------------------
CREATE TABLE dbo.ExamAttempt (
    Id            INT IDENTITY(1,1)  NOT NULL,
    ExamSetId     INT                NOT NULL,
    StudentId     INT                NOT NULL,
    StartedAt     DATETIME2(0)       NOT NULL CONSTRAINT DF_ExamAttempt_StartedAt DEFAULT (SYSUTCDATETIME()),
    SubmittedAt   DATETIME2(0)       NULL,
    TotalScore    DECIMAL(7,2)       NULL,
    CorrectCount  INT                NULL,
    Status        NVARCHAR(20)       NOT NULL CONSTRAINT DF_ExamAttempt_Status DEFAULT (N'InProgress'),
    CONSTRAINT PK_ExamAttempt          PRIMARY KEY (Id),
    CONSTRAINT FK_ExamAttempt_ExamSet  FOREIGN KEY (ExamSetId) REFERENCES dbo.ExamSet (Id),
    CONSTRAINT FK_ExamAttempt_Student  FOREIGN KEY (StudentId) REFERENCES dbo.Users (Id)
);
GO

-- ---------------------------------------------------------------------
-- 9. AttemptAnswer (đáp án sinh viên chọn cho từng câu)
--    SelectedOptionId = NULL nghĩa là bỏ trống (tính là sai).
--    Mọi câu trong đề đều có 1 dòng, kể cả câu bỏ trống.
--    UNIQUE (AttemptId, QuestionId) ở file 02.
-- ---------------------------------------------------------------------
CREATE TABLE dbo.AttemptAnswer (
    Id                INT IDENTITY(1,1)  NOT NULL,
    AttemptId         INT                NOT NULL,
    QuestionId        INT                NOT NULL,
    SelectedOptionId  INT                NULL,
    IsCorrect         BIT                NOT NULL CONSTRAINT DF_AttemptAnswer_IsCorrect    DEFAULT (0),
    ScoreAwarded      DECIMAL(5,2)       NOT NULL CONSTRAINT DF_AttemptAnswer_ScoreAwarded DEFAULT (0),
    CONSTRAINT PK_AttemptAnswer          PRIMARY KEY (Id),
    CONSTRAINT FK_AttemptAnswer_Attempt  FOREIGN KEY (AttemptId)        REFERENCES dbo.ExamAttempt (Id),
    CONSTRAINT FK_AttemptAnswer_Question FOREIGN KEY (QuestionId)       REFERENCES dbo.Question (Id),
    CONSTRAINT FK_AttemptAnswer_Option   FOREIGN KEY (SelectedOptionId) REFERENCES dbo.QuestionOption (Id)
);
GO

-- ---------------------------------------------------------------------
-- 10. AiExplanation (cache lời giải do Gemini sinh)
--     Gắn theo QuestionId (không gắn theo sinh viên): 1 câu chỉ cần gọi AI 1 lần.
--     UNIQUE (QuestionId) ở file 02.
-- ---------------------------------------------------------------------
CREATE TABLE dbo.AiExplanation (
    Id          INT IDENTITY(1,1)  NOT NULL,
    QuestionId  INT                NOT NULL,
    Content     NVARCHAR(MAX)      NOT NULL,
    CreatedAt   DATETIME2(0)       NOT NULL CONSTRAINT DF_AiExplanation_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_AiExplanation          PRIMARY KEY (Id),
    CONSTRAINT FK_AiExplanation_Question FOREIGN KEY (QuestionId) REFERENCES dbo.Question (Id)
);
GO

-- ---------------------------------------------------------------------
-- Kiểm tra nhanh: phải thấy đủ 9 bảng
-- ---------------------------------------------------------------------
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO