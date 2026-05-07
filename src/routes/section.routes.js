const express = require('express');
const controller = require('../controllers/section.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleAccess');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/', controller.getAllSections);
router.get('/:id', controller.getSectionById);
router.post('/', controller.createSection);
router.put('/:id', controller.updateSection);
router.delete('/:id', controller.deleteSection);

module.exports = router;
