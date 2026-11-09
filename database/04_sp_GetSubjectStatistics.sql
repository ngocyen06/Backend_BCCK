/* OWNER: Hiếu */
/* 04_sp_GetSubjectStatistics.sql
   Thống kê theo môn học — gọi từ src/repositories/statistics.repository.js
   với .input('SubjectId', subjectId).execute('sp_GetSubjectStatistics').

   Trả về MỘT result set: mỗi dòng là một bộ đề của môn kèm số liệu lượt làm.
   Cột đặt PascalCase để repository đổi sang camelCase (CONTRACT.md:8).
   Thời gian dùng UTC (CONTRACT.md:9). Câu hỏi xoá mềm bị loại (CONTRACT.md:61).
*/

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GetSubjectStatistics
    @SubjectId INT
AS
BEGIN
    SET NOCOUNT ON;

    /* 50001: môn học không tồn tại (CONTRACT.md:51 — bảng mã lỗi SP) */
    IF NOT EXISTS (SELECT 1 FROM dbo.Subjects WHERE Id = @SubjectId)
    BEGIN
        THROW 50001, N'Không tìm thấy môn học', 1;
    END;

    ;WITH QuestionCount AS (
        SELECT q.ExamSetId, COUNT(*) AS QuestionCount
        FROM dbo.Questions AS q
        WHERE q.IsDeleted = 0
        GROUP BY q.ExamSetId
    ),
    AttemptStats AS (
        SELECT
            a.ExamSetId,
            COUNT(*) AS TotalAttempts,
            SUM(CASE WHEN a.Status = 'Submitted' THEN 1 ELSE 0 END) AS SubmittedCount,
            SUM(CASE WHEN a.Status = 'InProgress' THEN 1 ELSE 0 END) AS InProgressCount,
            SUM(CASE WHEN a.Status = 'Expired' THEN 1 ELSE 0 END) AS ExpiredCount,
            AVG(CASE WHEN a.Status = 'Submitted' THEN CAST(a.Score AS FLOAT) END) AS AverageScore,
            MAX(CASE WHEN a.Status = 'Submitted' THEN a.Score END) AS HighestScore,
            MIN(CASE WHEN a.Status = 'Submitted' THEN a.Score END) AS LowestScore
        FROM dbo.Attempts AS a
        GROUP BY a.ExamSetId
    )
    SELECT
        s.Id                                            AS SubjectId,
        s.Code                                          AS SubjectCode,
        s.Name                                          AS SubjectName,
        es.Id                                           AS ExamSetId,
        es.Title                                        AS ExamSetTitle,
        es.Status                                       AS ExamSetStatus,
        ISNULL(qc.QuestionCount, 0)                     AS QuestionCount,
        ISNULL(st.TotalAttempts, 0)                     AS TotalAttempts,
        ISNULL(st.SubmittedCount, 0)                    AS SubmittedCount,
        ISNULL(st.InProgressCount, 0)                   AS InProgressCount,
        ISNULL(st.ExpiredCount, 0)                      AS ExpiredCount,
        st.AverageScore                                 AS AverageScore,
        st.HighestScore                                 AS HighestScore,
        st.LowestScore                                  AS LowestScore,
        CASE
            WHEN ISNULL(st.SubmittedCount, 0) = 0 THEN NULL
            ELSE CAST(CAST(ISNULL(st.SubmittedCount, 0) AS FLOAT) / st.TotalAttempts AS DECIMAL(5, 4))
        END                                             AS SubmitRate
    FROM dbo.Subjects AS s
    LEFT JOIN dbo.ExamSets AS es
        ON es.SubjectId = s.Id
    LEFT JOIN QuestionCount AS qc
        ON qc.ExamSetId = es.Id
    LEFT JOIN AttemptStats AS st
        ON st.ExamSetId = es.Id
    WHERE s.Id = @SubjectId
    ORDER BY es.Id;
END;
GO
