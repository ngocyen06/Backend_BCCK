// OWNER: Hiếu
// Repository thống kê: chỉ SQL, không quyết định nghiệp vụ (CONTRACT.md:19).
// Mọi tham số dùng .input(), cấm nối chuỗi SQL (CONTRACT.md:10).

const { getPool } = require('../config/db');

/**
 * Thống kê theo môn học — gọi stored procedure 04_sp_GetSubjectStatistics.
 * @param {number} subjectId
 * @returns {Promise<object[]>}
 */
async function getSubjectStatistics(subjectId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('SubjectId', subjectId)
    .execute('sp_GetSubjectStatistics');
  return result.recordset || [];
}

/**
 * Thống kê theo bộ đề: số lượt làm, điểm trung bình, cao nhất, thấp nhất.
 * @param {number} examSetId
 * @returns {Promise<object|null>}
 */
async function getExamSetStatistics(examSetId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('examSetId', examSetId)
    .query(`
      SELECT
        COUNT(*) AS TotalAttempts,
        SUM(CASE WHEN Status = 'Submitted' THEN 1 ELSE 0 END) AS SubmittedCount,
        SUM(CASE WHEN Status = 'InProgress' THEN 1 ELSE 0 END) AS InProgressCount,
        SUM(CASE WHEN Status = 'Expired' THEN 1 ELSE 0 END) AS ExpiredCount,
        AVG(CASE WHEN Status = 'Submitted' THEN CAST(Score AS FLOAT) END) AS AverageScore,
        MAX(CASE WHEN Status = 'Submitted' THEN Score END) AS HighestScore,
        MIN(CASE WHEN Status = 'Submitted' THEN Score END) AS LowestScore
      FROM Attempts
      WHERE ExamSetId = @examSetId
    `);
  const row = result.recordset && result.recordset[0];
  if (!row) return null;
  return {
    totalAttempts: row.TotalAttempts || 0,
    submittedCount: row.SubmittedCount || 0,
    inProgressCount: row.InProgressCount || 0,
    expiredCount: row.ExpiredCount || 0,
    averageScore: row.AverageScore === null ? null : Number(row.AverageScore),
    highestScore: row.HighestScore === null ? null : Number(row.HighestScore),
    lowestScore: row.LowestScore === null ? null : Number(row.LowestScore),
  };
}

module.exports = { getSubjectStatistics, getExamSetStatistics };
