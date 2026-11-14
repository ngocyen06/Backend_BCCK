/* OWNER: Yến */


USE quiz_exam ;
GO

-- Index lọc (filtered index) yêu cầu các SET này khi INSERT/UPDATE.
-- Driver mssql (tedious) mặc định đã bật. Nếu chạy bằng sqlcmd thì thêm tham số -I.
SET QUOTED_IDENTIFIER ON;
GO

/* ---------------------------------------------------------------------
   PHẦN A. CHECK constraint (giá trị hợp lệ)
   --------------------------------------------------------------------- */

-- Users
ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Role
    CHECK (Role IN (N'Admin', N'Teacher', N'Student'));
ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Username_NotBlank
    CHECK (LEN(LTRIM(RTRIM(Username))) >= 3);

-- Question
ALTER TABLE dbo.Question ADD CONSTRAINT CK_Question_Difficulty
    CHECK (Difficulty BETWEEN 1 AND 3);            -- 1 Dễ, 2 Trung bình, 3 Khó

-- ExamSet
ALTER TABLE dbo.ExamSet ADD CONSTRAINT CK_ExamSet_Status
    CHECK (Status IN (N'Draft', N'Published'));
ALTER TABLE dbo.ExamSet ADD CONSTRAINT CK_ExamSet_Duration
    CHECK (DurationMinutes > 0 AND DurationMinutes <= 300);

-- ExamSetQuestion
ALTER TABLE dbo.ExamSetQuestion ADD CONSTRAINT CK_ExamSetQuestion_OrderNo
    CHECK (OrderNo > 0);
ALTER TABLE dbo.ExamSetQuestion ADD CONSTRAINT CK_ExamSetQuestion_Score
    CHECK (Score > 0);

-- ExamAttempt
ALTER TABLE dbo.ExamAttempt ADD CONSTRAINT CK_ExamAttempt_Status
    CHECK (Status IN (N'InProgress', N'Submitted', N'Expired'));
ALTER TABLE dbo.ExamAttempt ADD CONSTRAINT CK_ExamAttempt_Score
    CHECK (TotalScore IS NULL OR TotalScore >= 0);
ALTER TABLE dbo.ExamAttempt ADD CONSTRAINT CK_ExamAttempt_CorrectCount
    CHECK (CorrectCount IS NULL OR CorrectCount >= 0);

-- AttemptAnswer
ALTER TABLE dbo.AttemptAnswer ADD CONSTRAINT CK_AttemptAnswer_Score
    CHECK (ScoreAwarded >= 0);
GO

/* ---------------------------------------------------------------------
   PHẦN B. UNIQUE (không trùng)
   --------------------------------------------------------------------- */

-- Username, Email, mã môn: không trùng (collation CI nên 'Admin' = 'admin')
ALTER TABLE dbo.Users   ADD CONSTRAINT UQ_Users_Username UNIQUE (Username);
ALTER TABLE dbo.Users   ADD CONSTRAINT UQ_Users_Email    UNIQUE (Email);
ALTER TABLE dbo.Subject ADD CONSTRAINT UQ_Subject_Code   UNIQUE (Code);

-- Một câu hỏi chỉ có tối đa 1 lời giải AI trong cache
ALTER TABLE dbo.AiExplanation ADD CONSTRAINT UQ_AiExplanation_Question UNIQUE (QuestionId);

-- Mỗi câu chỉ có 1 dòng trả lời trong 1 lượt làm bài
ALTER TABLE dbo.AttemptAnswer ADD CONSTRAINT UQ_AttemptAnswer_Attempt_Question UNIQUE (AttemptId, QuestionId);

-- Trong 1 bộ đề không có 2 câu cùng thứ tự
ALTER TABLE dbo.ExamSetQuestion ADD CONSTRAINT UQ_ExamSetQuestion_Order UNIQUE (ExamSetId, OrderNo);
GO

/* ---------------------------------------------------------------------
   PHẦN C. UNIQUE INDEX CÓ ĐIỀU KIỆN (quy tắc nghiệp vụ ở tầng DB)
   --------------------------------------------------------------------- */

-- QUY TẮC: mỗi sinh viên chỉ có 1 lượt InProgress trên cùng 1 bộ đề.
-- Cho phép nhiều lượt Submitted/Expired, chỉ chặn trùng lượt đang làm.
CREATE UNIQUE INDEX UX_Attempt_OneInProgress
    ON dbo.ExamAttempt (ExamSetId, StudentId)
    WHERE Status = N'InProgress';

-- QUY TẮC: mỗi câu hỏi có TỐI ĐA 1 đáp án đúng.
-- ("Ít nhất 1" do zod + question.service kiểm tra, vì SQL không ép được ở mức dòng.)
CREATE UNIQUE INDEX UX_QuestionOption_OneCorrect
    ON dbo.QuestionOption (QuestionId)
    WHERE IsCorrect = 1;
GO

/* ---------------------------------------------------------------------
   PHẦN D. INDEX tìm kiếm / thống kê
   (khóa chính và UNIQUE ở trên đã tự có index, SQL Server KHÔNG tự tạo index cho khóa ngoại)
   --------------------------------------------------------------------- */

-- Lọc ngân hàng câu hỏi: theo môn + chưa xóa + độ khó
CREATE INDEX IX_Question_Subject_Deleted_Difficulty
    ON dbo.Question (SubjectId, IsDeleted, Difficulty)
    INCLUDE (CreatedBy, CreatedAt);

-- Teacher xem câu hỏi của mình
CREATE INDEX IX_Question_CreatedBy
    ON dbo.Question (CreatedBy, IsDeleted);

-- Lấy options của 1 câu hỏi
CREATE INDEX IX_QuestionOption_Question
    ON dbo.QuestionOption (QuestionId);

-- Tìm bộ đề theo môn / trạng thái (Student chỉ xem Published)
CREATE INDEX IX_ExamSet_Status_Subject
    ON dbo.ExamSet (Status, SubjectId);

-- Teacher xem bộ đề của mình
CREATE INDEX IX_ExamSet_CreatedBy
    ON dbo.ExamSet (CreatedBy);

-- Tìm câu nằm trong những bộ đề nào (kiểm tra trước khi xóa, thống kê)
CREATE INDEX IX_ExamSetQuestion_Question
    ON dbo.ExamSetQuestion (QuestionId);

-- Lịch sử làm bài của sinh viên (mới nhất trước)
CREATE INDEX IX_ExamAttempt_Student_Started
    ON dbo.ExamAttempt (StudentId, StartedAt DESC);

-- "Bộ đề đã có người làm chưa?" và thống kê theo bộ đề
CREATE INDEX IX_ExamAttempt_ExamSet_Status
    ON dbo.ExamAttempt (ExamSetId, Status);

-- Thống kê "câu hay sai"
CREATE INDEX IX_AttemptAnswer_Question_Correct
    ON dbo.AttemptAnswer (QuestionId, IsCorrect);

-- Khóa ngoại SelectedOptionId (kiểm tra khi thao tác với QuestionOption)
CREATE INDEX IX_AttemptAnswer_SelectedOption
    ON dbo.AttemptAnswer (SelectedOptionId)
    WHERE SelectedOptionId IS NOT NULL;
GO

/* ---------------------------------------------------------------------
   KIỂM TRA NHANH: liệt kê constraint và index vừa tạo
   --------------------------------------------------------------------- */
SELECT name AS ConstraintName, OBJECT_NAME(parent_object_id) AS TableName, type_desc
FROM sys.objects
WHERE type IN ('C', 'UQ') AND SCHEMA_NAME(schema_id) = 'dbo'
ORDER BY TableName, ConstraintName;

SELECT OBJECT_NAME(object_id) AS TableName, name AS IndexName, is_unique, has_filter
FROM sys.indexes
WHERE name LIKE 'UX[_]%' OR name LIKE 'IX[_]%'
ORDER BY TableName, IndexName;
GO

/* ---------------------------------------------------------------------
   TỰ TEST (bỏ comment từng dòng để thấy bị chặn, sau đó comment lại)
   ---------------------------------------------------------------------
   -- Role sai:
   -- INSERT INTO dbo.Users (Username, PasswordHash, FullName, Email, Role)
   -- VALUES (N'abc', N'x', N'Test', N'a@a.com', N'Boss');            -- lỗi CK_Users_Role

   -- Độ khó sai (sau khi đã có seed 05):
   -- INSERT INTO dbo.Question (SubjectId, Content, Difficulty, CreatedBy)
   -- VALUES (1, N'x', 9, 2);                                           -- lỗi CK_Question_Difficulty

   -- Hai lượt InProgress trên cùng đề (sau khi có seed 05):
   -- INSERT INTO dbo.ExamAttempt (ExamSetId, StudentId) VALUES (1, 4);
   -- INSERT INTO dbo.ExamAttempt (ExamSetId, StudentId) VALUES (1, 4); -- lỗi UX_Attempt_OneInProgress
   --------------------------------------------------------------------- */