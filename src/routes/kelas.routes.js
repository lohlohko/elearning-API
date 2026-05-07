const express = require('express');
const controller = require('../controllers/kelas.controller');
const { authenticateToken } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/roleAccess');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/', controller.getAllKelas);
router.get('/:id', controller.getKelasById);
router.post('/', controller.createKelas);
router.put('/:id', controller.updateKelas);
router.delete('/:id', controller.deleteKelas);

module.exports = router;
