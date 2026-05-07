const express = require('express');
const controller = require('../controllers/auth.controller');
const { authenticateToken, authenticateAuthSession } = require('../middlewares/auth');

const router = express.Router();

router.post('/login', controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', authenticateAuthSession, controller.logout);
router.get('/me', authenticateAuthSession, controller.me);

module.exports = router;
