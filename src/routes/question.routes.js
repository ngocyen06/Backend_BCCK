// OWNER: Khôi
'use strict';

const express = require('express');
const questionController = require('../controllers/question.controller');

const AUTH_MIDDLEWARE_PATH = '../middlewares/authenticate';
const AUTHORIZE_MIDDLEWARE_PATH = '../middlewares/authorize';
const VALIDATE_MIDDLEWARE_PATH = '../middlewares/validate';
const ROLE_CONSTANT_PATH = '../constants/roles';
const SCHEMA_PATH = '../schemas/question.schema';

const authenticate = require(AUTH_MIDDLEWARE_PATH);
const authorize = require(AUTHORIZE_MIDDLEWARE_PATH);
const validate = require(VALIDATE_MIDDLEWARE_PATH);
const { ROLES } = require(ROLE_CONSTANT_PATH);
const {
  createQuestionSchema,
  updateQuestionSchema,
  listQuestionQuerySchema,
  questionIdParamSchema,
} = require(SCHEMA_PATH);

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  authorize(ROLES.Admin, ROLES.Teacher),
  validate({ query: listQuestionQuerySchema }),
  questionController.list
);

router.get(
  '/:id',
  authorize(ROLES.Admin, ROLES.Teacher),
  validate({ params: questionIdParamSchema }),
  questionController.getById
);

router.post(
  '/',
  authorize(ROLES.Teacher, ROLES.Admin),
  validate({ body: createQuestionSchema }),
  questionController.create
);

router.put(
  '/:id',
  authorize(ROLES.Teacher, ROLES.Admin),
  validate({ params: questionIdParamSchema, body: updateQuestionSchema }),
  questionController.update
);

router.delete(
  '/:id',
  authorize(ROLES.Teacher, ROLES.Admin),
  validate({ params: questionIdParamSchema }),
  questionController.remove
);

module.exports = router;
