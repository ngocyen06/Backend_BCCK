/* OWNER: Yến */
/* 
   Tài khoản (khớp CONTRACT.md mục 12):
     admin     / Admin@123     (Admin)
     teacher1  / Teacher@123   (Teacher)
     teacher2  / Teacher@123   (Teacher)
     student1  / Student@123   (Student)
     student2  / Student@123   (Student)
*/

USE quiz_exam ;
GO

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
GO

BEGIN TRY
    BEGIN TRAN;

    /* -----------------------------------------------------------------
       1. Users (Id sẽ là 1..5 theo đúng thứ tự dưới, vì 01 reset IDENTITY)
          1 admin | 2 teacher1 | 3 teacher2 | 4 student1 | 5 student2
       ----------------------------------------------------------------- */
    INSERT INTO dbo.Users (Username, PasswordHash, FullName, Email, Role) VALUES
    (N'admin',    N'$2b$10$wILgOcXfMqwdmuXIRQZIJuuCbV1NfvQwSJS/0loE8pEfmSmuHNYH2', N'Quản trị viên',    N'admin@quiz.local',    N'Admin'),
    (N'teacher1', N'$2b$10$PBrHwJdmojqwx01Qg3jBZOqelhWsED0E2nIeeRhUGGuRB0VVz1XKy', N'Giảng viên Một',  N'teacher1@quiz.local', N'Teacher'),
    (N'teacher2', N'$2b$10$gOZPu.niyUjRj4D4b4ofG.TFOGuLcVHmONghrsyXseyXHOOxRzzVq', N'Giảng viên Hai',  N'teacher2@quiz.local', N'Teacher'),
    (N'student1', N'$2b$10$9oVcH/GLQCeKaQMBCpOJuuH9dR9Mysm1WzSWVpXRSMeTjysZY2Y/u', N'Sinh viên Một',   N'student1@quiz.local', N'Student'),
    (N'student2', N'$2b$10$tbnIOs4tyI.j5smQaizGfeNs8qCNjPjm1PHoFRWK8OfLAPXcV8l9i', N'Sinh viên Hai',   N'student2@quiz.local', N'Student');

    /* -----------------------------------------------------------------
       2. Subject
       ----------------------------------------------------------------- */
    INSERT INTO dbo.Subject (Code, Name, Description) VALUES
    (N'HCM202', N'Tư tưởng Hồ Chí Minh', N'Ôn thi trắc nghiệm môn Tư tưởng Hồ Chí Minh'),
    (N'NET101', N'Mạng máy tính',        N'Ôn thi trắc nghiệm môn Mạng máy tính');

    DECLARE @Teacher1 INT = (SELECT Id FROM dbo.Users   WHERE Username = N'teacher1');
    DECLARE @Hcm      INT = (SELECT Id FROM dbo.Subject WHERE Code     = N'HCM202');
    DECLARE @Net      INT = (SELECT Id FROM dbo.Subject WHERE Code     = N'NET101');

    /* -----------------------------------------------------------------
       3. Câu hỏi mẫu (do teacher1 soạn): 5 câu HCM202 + 3 câu NET101
          Dùng để Yến test start/submit trước khi Khôi làm xong Question/ExamSet.
          Mỗi câu 4 option, đúng 1 đáp án.
       ----------------------------------------------------------------- */
    DECLARE @Q INT;

    -- HCM 1
    INSERT INTO dbo.Question (SubjectId, Content, Difficulty, Explanation, CreatedBy)
    VALUES (@Hcm, N'Chủ tịch Hồ Chí Minh sinh năm nào?', 1, N'Hồ Chí Minh sinh ngày 19/5/1890 tại Nghệ An.', @Teacher1);
    SET @Q = SCOPE_IDENTITY();
    INSERT INTO dbo.QuestionOption (QuestionId, Content, IsCorrect) VALUES
    (@Q, N'1890', 1), (@Q, N'1911', 0), (@Q, N'1930', 0), (@Q, N'1945', 0);

    -- HCM 2
    INSERT INTO dbo.Question (SubjectId, Content, Difficulty, Explanation, CreatedBy)
    VALUES (@Hcm, N'Nguyễn Tất Thành ra đi tìm đường cứu nước vào năm nào?', 1, N'Ngày 5/6/1911, Người rời bến Nhà Rồng ra đi tìm đường cứu nước.', @Teacher1);
    SET @Q = SCOPE_IDENTITY();
    INSERT INTO dbo.QuestionOption (QuestionId, Content, IsCorrect) VALUES
    (@Q, N'1905', 0), (@Q, N'1911', 1), (@Q, N'1919', 0), (@Q, N'1925', 0);

    -- HCM 3
    INSERT INTO dbo.Question (SubjectId, Content, Difficulty, Explanation, CreatedBy)
    VALUES (@Hcm, N'Chủ tịch Hồ Chí Minh đọc Tuyên ngôn độc lập khai sinh nước Việt Nam Dân chủ Cộng hòa vào ngày nào?', 1, N'Ngày 2/9/1945 tại Quảng trường Ba Đình, Hà Nội.', @Teacher1);
    SET @Q = SCOPE_IDENTITY();
    INSERT INTO dbo.QuestionOption (QuestionId, Content, IsCorrect) VALUES
    (@Q, N'19/8/1945', 0), (@Q, N'2/9/1945', 1), (@Q, N'2/3/1946', 0), (@Q, N'19/12/1946', 0);

    -- HCM 4
    INSERT INTO dbo.Question (SubjectId, Content, Difficulty, Explanation, CreatedBy)
    VALUES (@Hcm, N'Đảng Cộng sản Việt Nam được thành lập vào năm nào?', 1, N'Hội nghị hợp nhất các tổ chức cộng sản đầu năm 1930 do Nguyễn Ái Quốc chủ trì.', @Teacher1);
    SET @Q = SCOPE_IDENTITY();
    INSERT INTO dbo.QuestionOption (QuestionId, Content, IsCorrect) VALUES
    (@Q, N'1925', 0), (@Q, N'1927', 0), (@Q, N'1930', 1), (@Q, N'1941', 0);

    -- HCM 5
    INSERT INTO dbo.Question (SubjectId, Content, Difficulty, Explanation, CreatedBy)
    VALUES (@Hcm, N'Tác phẩm "Đường Kách mệnh" của Nguyễn Ái Quốc được xuất bản lần đầu vào năm nào?', 2, N'Tác phẩm xuất bản năm 1927, tập hợp các bài giảng cho lớp huấn luyện ở Quảng Châu.', @Teacher1);
    SET @Q = SCOPE_IDENTITY();
    INSERT INTO dbo.QuestionOption (QuestionId, Content, IsCorrect) VALUES
    (@Q, N'1920', 0), (@Q, N'1925', 0), (@Q, N'1927', 1), (@Q, N'1930', 0);

    -- NET 1
    INSERT INTO dbo.Question (SubjectId, Content, Difficulty, Explanation, CreatedBy)
    VALUES (@Net, N'Mô hình OSI có bao nhiêu tầng?', 1, N'OSI gồm 7 tầng: Vật lý, Liên kết dữ liệu, Mạng, Giao vận, Phiên, Trình diễn, Ứng dụng.', @Teacher1);
    SET @Q = SCOPE_IDENTITY();
    INSERT INTO dbo.QuestionOption (QuestionId, Content, IsCorrect) VALUES
    (@Q, N'4', 0), (@Q, N'5', 0), (@Q, N'7', 1), (@Q, N'9', 0);

    -- NET 2
    INSERT INTO dbo.Question (SubjectId, Content, Difficulty, Explanation, CreatedBy)
    VALUES (@Net, N'Giao thức nào hoạt động ở tầng Giao vận (Transport) và đảm bảo truyền dữ liệu tin cậy?', 2, N'TCP thiết lập kết nối, đánh số thứ tự và truyền lại gói bị mất nên tin cậy; UDP thì không.', @Teacher1);
    SET @Q = SCOPE_IDENTITY();
    INSERT INTO dbo.QuestionOption (QuestionId, Content, IsCorrect) VALUES
    (@Q, N'UDP', 0), (@Q, N'IP', 0), (@Q, N'TCP', 1), (@Q, N'ICMP', 0);

    -- NET 3
    INSERT INTO dbo.Question (SubjectId, Content, Difficulty, Explanation, CreatedBy)
    VALUES (@Net, N'Cổng (port) mặc định của giao thức HTTP là bao nhiêu?', 1, N'HTTP dùng cổng 80, HTTPS dùng cổng 443.', @Teacher1);
    SET @Q = SCOPE_IDENTITY();
    INSERT INTO dbo.QuestionOption (QuestionId, Content, IsCorrect) VALUES
    (@Q, N'21', 0), (@Q, N'25', 0), (@Q, N'80', 1), (@Q, N'443', 0);

    /* -----------------------------------------------------------------
       4. Bộ đề mẫu ĐÃ XUẤT BẢN: "Đề ôn tập HCM202 - Đề 1"
          5 câu x 2 điểm = 10 điểm, thời gian 15 phút.
          (Id bộ đề = 1 vì 01 reset IDENTITY)
       ----------------------------------------------------------------- */
    INSERT INTO dbo.ExamSet (SubjectId, Title, DurationMinutes, Status, CreatedBy, PublishedAt)
    VALUES (@Hcm, N'Đề ôn tập HCM202 - Đề 1', 15, N'Published', @Teacher1, SYSUTCDATETIME());

    DECLARE @Exam INT = SCOPE_IDENTITY();

    INSERT INTO dbo.ExamSetQuestion (ExamSetId, QuestionId, OrderNo, Score)
    SELECT @Exam,
           q.Id,
           ROW_NUMBER() OVER (ORDER BY q.Id),
           2
    FROM dbo.Question q
    WHERE q.SubjectId = @Hcm AND q.IsDeleted = 0;

    -- Bộ đề thứ 2 ở trạng thái Draft, để Khôi/Yến test "Student không thấy đề Draft"
    INSERT INTO dbo.ExamSet (SubjectId, Title, DurationMinutes, Status, CreatedBy)
    VALUES (@Net, N'Đề nháp NET101 - chưa xuất bản', 10, N'Draft', @Teacher1);

    COMMIT;
    PRINT N'Seed thành công.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    THROW;
END CATCH
GO

/* ---------------------------------------------------------------------
   KIỂM TRA NHANH
   --------------------------------------------------------------------- */
SELECT Id, Username, Role, IsActive FROM dbo.Users ORDER BY Id;
SELECT Id, Code, Name              FROM dbo.Subject ORDER BY Id;
SELECT s.Code, COUNT(*) AS QuestionCount
FROM dbo.Question q JOIN dbo.Subject s ON s.Id = q.SubjectId
GROUP BY s.Code;
SELECT e.Id, e.Title, e.Status, COUNT(esq.QuestionId) AS QuestionCount, SUM(esq.Score) AS TotalScore
FROM dbo.ExamSet e LEFT JOIN dbo.ExamSetQuestion esq ON esq.ExamSetId = e.Id
GROUP BY e.Id, e.Title, e.Status;
GO