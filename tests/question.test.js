// OWNER: Khôi
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const {
  createQuestionSchema,
  updateQuestionSchema,
  listQuestionQuerySchema,
} = require('../src/schemas/question.schema');

function validQuestion() {
  return {
    subjectId: 1,
    content: 'Tu tuong Ho Chi Minh ra doi tu nam nao?',
    difficulty: 1,
    explanation: 'Nam 1911 la moc Bac ra di tim duong cuu nuoc.',
    options: [
      { content: '1911', isCorrect: true },
      { content: '1930', isCorrect: false },
      { content: '1945', isCorrect: false },
    ],
  };
}

test('createQuestionSchema accepts valid payload', () => {
  const result = createQuestionSchema.safeParse(validQuestion());
  assert.strictEqual(result.success, true);
});

test('createQuestionSchema rejects payload without correct option', () => {
  const payload = validQuestion();
  payload.options = [
    { content: 'A', isCorrect: false },
    { content: 'B', isCorrect: false },
  ];

  const result = createQuestionSchema.safeParse(payload);
  assert.strictEqual(result.success, false);
});

test('createQuestionSchema rejects payload with two correct options', () => {
  const payload = validQuestion();
  payload.options = [
    { content: 'A', isCorrect: true },
    { content: 'B', isCorrect: true },
  ];

  const result = createQuestionSchema.safeParse(payload);
  assert.strictEqual(result.success, false);
});

test('createQuestionSchema rejects payload with one option', () => {
  const payload = validQuestion();
  payload.options = [{ content: 'A', isCorrect: true }];

  const result = createQuestionSchema.safeParse(payload);
  assert.strictEqual(result.success, false);
});

test('createQuestionSchema rejects difficulty out of range', () => {
  const payload = validQuestion();
  payload.difficulty = 5;

  const result = createQuestionSchema.safeParse(payload);
  assert.strictEqual(result.success, false);
});

test('createQuestionSchema rejects empty content', () => {
  const payload = validQuestion();
  payload.content = '   ';

  const result = createQuestionSchema.safeParse(payload);
  assert.strictEqual(result.success, false);
});

test('updateQuestionSchema rejects empty body', () => {
  const result = updateQuestionSchema.safeParse({});
  assert.strictEqual(result.success, false);
});

test('updateQuestionSchema accepts single field update', () => {
  const result = updateQuestionSchema.safeParse({ content: 'Cau hoi moi' });
  assert.strictEqual(result.success, true);
});

test('listQuestionQuerySchema uses default paging', () => {
  const result = listQuestionQuerySchema.safeParse({});
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.page, 1);
  assert.strictEqual(result.data.pageSize, 10);
});

test('listQuestionQuerySchema rejects pageSize above 100', () => {
  const result = listQuestionQuerySchema.safeParse({ pageSize: '101' });
  assert.strictEqual(result.success, false);
});
