// OWNER: Yến
// Controller lượt làm bài: chỉ đọc req, gọi service, trả res (CONTRACT.md:17).
// studentId LUÔN lấy từ req.user.id, không bao giờ lấy từ body (CONTRACT.md:20).

const asyncHandler = require('../utils/asyncHandler');
const attemptService = require('../services/attempt.service');

const start = asyncHandler(async (req, res) => {
  const data = await attemptService.startAttempt(Number(req.params.id), req.user.id);
  res.status(201).json(data);
});

const getForTaking = asyncHandler(async (req, res) => {
  const data = await attemptService.getAttemptForTaking(Number(req.params.id), req.user);
  res.status(200).json(data);
});

const submit = asyncHandler(async (req, res) => {
  const attempt = await attemptService.submitAttempt(Number(req.params.id), req.body, req.user);
  res.status(200).json(attempt);
});

const listMine = asyncHandler(async (req, res) => {
  const data = await attemptService.listMyAttempts(req.user.id, req.query);
  res.status(200).json(data);
});

const result = asyncHandler(async (req, res) => {
  const data = await attemptService.getResult(Number(req.params.id), req.user);
  res.status(200).json(data);
});

module.exports = { start, getForTaking, submit, listMine, result };
