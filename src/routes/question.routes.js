// OWNER: Khôi
'use strict';

const express = require('express');
const examSetController = require('../controllers/examSet.controller');

const AUTH_MIDDLEWARE_PATH = '../middlewares/authenticate';
const AUTHORIZE_MIDDLEWARE_PATH = '../middlewares/authorize';
const VALIDATE_MIDDLEWARE_PATH = '../middlewares/validate';
const ROLE_CONSTANT_PATH = '../constants/roles';
const SCHEMA_PATH = '../schemas/examSet.schema';

const authenticate = require(AUTH_MIDDLEWARE_PATH);
const authorize = require(AUTHORIZE_MIDDLEWARE_PATH);
const validate = require(VALIDATE_MIDDLEWARE_PATH);
const { ROLES } = require(ROLE_CONSTANT_PATH);
const {
  createExamSetSchema,
  updateExamSetSchema,
  addExamSetQuestionsSchema,
  listExamSetQuerySchema,
  examSetIdParamSchema,
  examSetQuestionParamSchema,
} = require(SCHEMA_PATH);

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  authorize(ROLES.Admin, ROLES.Teacher, ROLES.Student),
  validate({ query: listExamSetQuerySchema }),
  examSetController.list
);

router.get(
  '/:id',
  authorize(ROLES.Admin, ROLES.Teacher, ROLES.Student),
  validate({ params: examSetIdParamSchema }),
  examSetController.getById
);

router.post(
  '/',
  authorize(ROLES.Teacher),
  validate({ body: createExamSetSchema }),
  examSetController.create
);

router.put(
  '/:id',
  authorize(ROLES.Teacher),
  validate({ params: examSetIdParamSchema, body: updateExamSetSchema }),
  examSetController.update
);

router.post(
  '/:id/questions',
  authorize(ROLES.Teacher),
  validate({ params: examSetIdParamSchema, body: addExamSetQuestionsSchema }),
  examSetController.addQuestions
);

router.delete(
  '/:id/questions/:questionId',
  authorize(ROLES.Teacher),
  validate({ params: examSetQuestionParamSchema }),
  examSetController.removeQuestion
);

router.patch(
  '/:id/publish',
  authorize(ROLES.Teacher),
  validate({ params: examSetIdParamSchema }),
  examSetController.publish
);

module.exports = router;
