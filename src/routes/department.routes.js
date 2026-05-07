const express = require('express');
const controller = require('../controllers/department.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleAccess');

const router = express.Router();

router.use(authenticateToken);

router.get('/', requireRole(['admin', 'pengajar']), controller.getAllDepartments);
router.get('/:id', requireRole(['admin', 'pengajar']), controller.getDepartmentById);
router.post('/', requireRole(['admin']), controller.createDepartment);
router.put('/:id', requireRole(['admin']), controller.updateDepartment);
router.delete('/:id', requireRole(['admin']), controller.deleteDepartment);

module.exports = router;
