const express = require('express');
const controller = require('../controllers/role.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleAccess');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/', controller.getAllRoles);
router.get('/:id', controller.getRoleById);
router.post('/', controller.createRole);
router.put('/:id', controller.updateRole);
router.delete('/:id', controller.deleteRole);

module.exports = router;