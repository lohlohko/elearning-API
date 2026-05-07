const express = require('express');
const controller = require('../controllers/kelasMember.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleAccess');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/', controller.getAllKelasMembers);
router.get('/:id', controller.getKelasMemberById);
router.post('/', controller.createKelasMember);
router.put('/:id', controller.updateKelasMember);
router.delete('/:id', controller.deleteKelasMember);

module.exports = router;
