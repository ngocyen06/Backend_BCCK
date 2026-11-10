// OWNER: Yến
// Đường dẫn xác thực. Register/login công khai; /me cần đăng nhập (CONTRACT.md:41,43).

const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const { registerSchema, loginSchema } = require('../schemas/auth.schema');

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

router.get('/me', authenticate, authController.me);

module.exports = router;
