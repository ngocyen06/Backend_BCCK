/* OWNER: Yến */
/* =====================================================================
   03_sp_SubmitAndGradeAttempt.sql
   Stored procedure chấm điểm một lượt làm bài.

   Gọi từ src/repositories/attempt.repository.js:
     .input('AttemptId', AttemptId).input('StudentId', StudentId)
     .execute('sp_SubmitAndGradeAttempt')

   Quy tắc (CONTRACT.md:53-61):
   - Chỉ chấm khi lượt đang InProgress; nộp lần hai -> lỗi 50003.
   - Điểm mỗi câu lấy theo ExamSetQuestion.Score (điểm do DB quyết, client không gửi).
   - Câu bỏ trống (SelectedOptionId IS NULL) tính là sai.
   - Mọi câu trong đề đều có 1 dòng AttemptAnswer; nếu client không gửi câu nào
     thì vẫn tạo dòng trống để thống kê đầy đủ.
   - Giờ nộp dùng UTC (SYSUTCDATETIME).

   Mã lỗi: 50002 = không tìm thấy lượt; 50003 = lượt không ở trạng thái InProgress.
   ===================================================================== */

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_SubmitAndGradeAttempt
    @AttemptId INT,
    @StudentId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @ExamSetId INT;
    DECLARE @Status NVARCHAR(20);
    DECLARE @OwnerId INT;

    SELECT @ExamSetId = ExamSetId,
           @Status = Status,
           @OwnerId = StudentId
    FROM dbo.ExamAttempt WITH (UPDLOCK, HOLDLOCK)
    WHERE Id = @AttemptId;

    /* 50002: lượt làm không tồn tại (CONTRACT.md:51) */
    IF @ExamSetId IS NULL
    BEGIN
        THROW 50002, N'Không tìm thấy lượt làm bài', 1;
    END;

    /* Chủ lượt phải khớp người gọi (ownership ở tầng DB, CONTRACT.md:42) */
    IF @OwnerId <> @StudentId
    BEGIN
        THROW 50002, N'Không tìm thấy lượt làm bài', 1;
    END;

    /* 50003: chỉ chấm lượt đang InProgress */
    IF @Status <> N'InProgress'
    BEGIN
        THROW 50003, N'Lượt làm bài không ở trạng thái đang làm', 1;
    END;

    BEGIN TRANSACTION;

    /* 1. Bổ sung dòng cho các câu trong đề mà client không gửi (bỏ trống) */
    INSERT INTO dbo.AttemptAnswer (AttemptId, QuestionId, SelectedOptionId, IsCorrect, ScoreAwarded)
    SELECT @AttemptId, esq.QuestionId, NULL, 0, 0
    FROM dbo.ExamSetQuestion AS esq
    WHERE esq.ExamSetId = @ExamSetId
      AND NOT EXISTS (
          SELECT 1 FROM dbo.AttemptAnswer AS aa
          WHERE aa.AttemptId = @AttemptId AND aa.QuestionId = esq.QuestionId
      );

    /* 2. Chấm điểm: đúng khi option được chọn thuộc đúng câu và IsCorrect = 1 */
    UPDATE aa
    SET aa.IsCorrect = CASE
            WHEN o.Id IS NOT NULL AND o.QuestionId = aa.QuestionId AND o.IsCorrect = 1 THEN 1
            ELSE 0
        END,
        aa.ScoreAwarded = CASE
            WHEN o.Id IS NOT NULL AND o.QuestionId = aa.QuestionId AND o.IsCorrect = 1
                THEN esq.Score
            ELSE 0
        END
    FROM dbo.AttemptAnswer AS aa
    JOIN dbo.ExamSetQuestion AS esq
        ON esq.ExamSetId = @ExamSetId AND esq.QuestionId = aa.QuestionId
    LEFT JOIN dbo.QuestionOption AS o
        ON o.Id = aa.SelectedOptionId
    WHERE aa.AttemptId = @AttemptId;

    /* 3. Cập nhật tổng điểm + số câu đúng + trạng thái */
    UPDATE dbo.ExamAttempt
    SET TotalScore   = ISNULL((
            SELECT SUM(aa.ScoreAwarded)
            FROM dbo.AttemptAnswer AS aa
            WHERE aa.AttemptId = @AttemptId
        ), 0),
        CorrectCount = ISNULL((
            SELECT SUM(CASE WHEN aa.IsCorrect = 1 THEN 1 ELSE 0 END)
            FROM dbo.AttemptAnswer AS aa
            WHERE aa.AttemptId = @AttemptId
        ), 0),
        SubmittedAt  = SYSUTCDATETIME(),
        Status       = N'Submitted'
    WHERE Id = @AttemptId;

    COMMIT TRANSACTION;

    /* Trả về bản ghi lượt làm sau khi chấm để service không cần query lại. */
    SELECT Id, ExamSetId, StudentId, StartedAt, SubmittedAt,
           TotalScore, CorrectCount, Status
    FROM dbo.ExamAttempt
    WHERE Id = @AttemptId;
END;
GO
