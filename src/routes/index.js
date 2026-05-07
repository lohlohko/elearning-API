const express = require('express');
const authRoutes = require('./auth.routes');
const accountRoutes = require('./account.routes');
const departmentRoutes = require('./department.routes');
const roleRoutes = require('./role.routes');
const sectionRoutes = require('./section.routes');
const lineRoutes = require('./line.routes');
const materiRoutes = require('./materi.routes');
const kelasRoutes = require('./kelas.routes');
const kelasMemberRoutes = require('./kelasMember.routes');
const pertemuanRoutes = require('./pertemuan.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/departments', departmentRoutes);
router.use('/roles', roleRoutes);
router.use('/sections', sectionRoutes);
router.use('/lines', lineRoutes);
router.use('/kelas', kelasRoutes);
router.use('/kelasMember', kelasMemberRoutes);
router.use('/materi', materiRoutes);
router.use('/pertemuan', pertemuanRoutes);

module.exports = router;
