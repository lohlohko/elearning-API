const express = require('express');
const controller = require('../controllers/pertemuan.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleAccess');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/', controller.getAllPertemuan);
router.get('/:id', controller.getPertemuanById);
router.post('/', controller.createPertemuan);
router.put('/:id', controller.updatePertemuan);
router.delete('/:id', controller.deletePertemuan);

module.exports = router;
