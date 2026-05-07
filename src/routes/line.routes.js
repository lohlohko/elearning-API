const express = require('express');
const controller = require('../controllers/line.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleAccess');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/', controller.getAllLines);
router.get('/:id', controller.getLineById);
router.post('/', controller.createLine);
router.put('/:id', controller.updateLine);
router.delete('/:id', controller.deleteLine);

module.exports = router;
