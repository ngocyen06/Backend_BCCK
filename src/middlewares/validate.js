// OWNER: Yến
// Kiểm tra dữ liệu vào bằng zod; lỗi -> 400 VALIDATION_ERROR kèm details (CONTRACT.md:26).
// Chữ ký validate(schema, source?) để mọi route hiện có (chỉ truyền schema) vẫn chạy.

const AppError = require('../utils/AppError');

/**
 * @param {{ safeParse: (input: any) => { success: boolean, data?: any, error?: any } }} schema
 * @param {...('body'|'query'|'params')} rest source, mặc định 'body'
 */
function validate(schemaOrMap, ...rest) {
  // Kiểu 1 (attempt.routes.js, auth.routes.js): validate(schema, 'body'|'query'|'params')
  // Kiểu 2 (examSet/question/statistics/subject/user routes): validate({ body, params, query })
  const isMap =
    schemaOrMap &&
    typeof schemaOrMap === 'object' &&
    typeof schemaOrMap.safeParse !== 'function' &&
    (schemaOrMap.body || schemaOrMap.params || schemaOrMap.query);

  if (isMap) {
    return function validateParts(req, res, next) {
      const errors = [];
      for (const key of ['params', 'query', 'body']) {
        const schema = schemaOrMap[key];
        if (!schema) continue;
        const input = req[key] === undefined ? {} : req[key];
        const result = schema.safeParse(input);
        if (!result.success) {
          const issues = result.error && Array.isArray(result.error.issues) ? result.error.issues : [];
          for (const issue of issues) {
            errors.push({
              path: [key, ...(Array.isArray(issue.path) ? issue.path : [])],
              message: issue.message,
            });
          }
        } else {
          try {
            req[key] = result.data;
          } catch (error) {
            Object.defineProperty(req, key, { value: result.data, writable: true, configurable: true });
          }
        }
      }
      if (errors.length > 0) return next(AppError.validation(errors));
      return next();
    };
  }

  const key = rest.length > 0 && rest[0] ? rest[0] : 'body';
  return function validateMiddleware(req, res, next) {
    const input = req[key] === undefined ? {} : req[key];
    const result = schemaOrMap.safeParse(input);
    if (!result.success) {
      const issues = result.error && Array.isArray(result.error.issues) ? result.error.issues : [];
      const details = issues.map((issue) => ({
        path: Array.isArray(issue.path) ? issue.path : [],
        message: issue.message,
      }));
      return next(AppError.validation(details));
    }
    try {
      req[key] = result.data;
    } catch (error) {
      Object.defineProperty(req, key, { value: result.data, writable: true, configurable: true });
    }
    return next();
  };
}

exports.validate = validate;
module.exports = validate;
module.exports.validate = validate;
