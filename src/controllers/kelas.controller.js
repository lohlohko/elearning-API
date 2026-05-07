const kelasService = require('../services/kelas.service');
const response = require('../utils/response');

const parseId = (value) => Number.parseInt(value, 10);
const normalizeText = (value) => String(value || '').trim();

const toNullableDate = (value) => {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return new Date(parsed);
};

const toStatusAktif = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 1;
  }

  const numeric = Number.parseInt(value, 10);
  return Number.isNaN(numeric) ? undefined : numeric ? 1 : 0;
};

const mapKelasResponse = (row) => ({
  kelas_id: row.id,
  nama_kelas: row.nama_kelas,
  dari_tanggal: row.dari_tanggal,
  sampai_tanggal: row.sampai_tanggal,
  status_aktif: row.status_aktif,
  section: {
    id: row.section_id,
    name: row.section_name,
    department: {
      id: row.department_id,
      name: row.department_name,
    },
  },
  created_by: {
    id: row.created_by,
    name: row.created_by_name,
    npk: row.created_by_npk,
  },
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const getAllKelas = async (req, res) => {
  try {
    const rows = await kelasService.findAll();
    return response.ok(res, 'Kelas retrieved successfully', rows.map(mapKelasResponse));
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const getKelasById = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid kelas id');
    }

    const data = await kelasService.findById(id);
    if (!data) {
      return response.notFound(res, 'Kelas not found');
    }

    return response.ok(res, 'Kelas retrieved successfully', mapKelasResponse(data));
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const createKelas = async (req, res) => {
  try {
    const sectionId = parseId(req.body.section_id);
    if (Number.isNaN(sectionId)) {
      return response.badRequest(res, 'section_id is required and must be a number');
    }

    const namaKelas = normalizeText(req.body.nama_kelas);
    if (!namaKelas) {
      return response.badRequest(res, 'nama_kelas is required');
    }

    const dariTanggal = toNullableDate(req.body.dari_tanggal);
    if (dariTanggal === undefined) {
      return response.badRequest(res, 'dari_tanggal must be a valid date');
    }

    const sampaiTanggal = toNullableDate(req.body.sampai_tanggal);
    if (sampaiTanggal === undefined) {
      return response.badRequest(res, 'sampai_tanggal must be a valid date');
    }

    const statusAktif = toStatusAktif(req.body.status_aktif);
    if (statusAktif === undefined) {
      return response.badRequest(res, 'status_aktif must be 0 or 1');
    }

    const accountId = req.auth && req.auth.account_id ? Number(req.auth.account_id) : null;
    if (!accountId) {
      return response.unauthorized(res, 'Authentication required');
    }

    const existing = await kelasService.findBySectionAndName(sectionId, namaKelas);
    if (existing) {
      return response.conflict(res, 'Kelas name already exists in this section');
    }

    const data = await kelasService.create({
      section_id: sectionId,
      created_by: accountId,
      nama_kelas: namaKelas,
      dari_tanggal: dariTanggal,
      sampai_tanggal: sampaiTanggal,
      status_aktif: statusAktif,
    });

    return response.created(res, 'Kelas created successfully', mapKelasResponse(data));
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return response.badRequest(res, 'Invalid foreign key');
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return response.conflict(res, 'Kelas name already exists in this section');
    }

    return response.serverError(res, error.message);
  }
};

const updateKelas = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid kelas id');
    }

    const current = await kelasService.findById(id);
    if (!current) {
      return response.notFound(res, 'Kelas not found');
    }

    const sectionId = parseId(req.body.section_id);
    if (Number.isNaN(sectionId)) {
      return response.badRequest(res, 'section_id is required and must be a number');
    }

    const namaKelas = normalizeText(req.body.nama_kelas);
    if (!namaKelas) {
      return response.badRequest(res, 'nama_kelas is required');
    }

    const dariTanggal = toNullableDate(req.body.dari_tanggal);
    if (dariTanggal === undefined) {
      return response.badRequest(res, 'dari_tanggal must be a valid date');
    }

    const sampaiTanggal = toNullableDate(req.body.sampai_tanggal);
    if (sampaiTanggal === undefined) {
      return response.badRequest(res, 'sampai_tanggal must be a valid date');
    }

    const statusAktif = toStatusAktif(req.body.status_aktif);
    if (statusAktif === undefined) {
      return response.badRequest(res, 'status_aktif must be 0 or 1');
    }

    const existing = await kelasService.findBySectionAndName(sectionId, namaKelas);
    if (existing && Number(existing.id) !== id) {
      return response.conflict(res, 'Kelas name already exists in this section');
    }

    await kelasService.update(id, {
      section_id: sectionId,
      nama_kelas: namaKelas,
      dari_tanggal: dariTanggal,
      sampai_tanggal: sampaiTanggal,
      status_aktif: statusAktif,
    });

    const updated = await kelasService.findById(id);
    return response.ok(res, 'Kelas updated successfully', mapKelasResponse(updated));
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return response.badRequest(res, 'Invalid foreign key');
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return response.conflict(res, 'Kelas name already exists in this section');
    }

    return response.serverError(res, error.message);
  }
};

const deleteKelas = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid kelas id');
    }

    const current = await kelasService.findById(id);
    if (!current) {
      return response.notFound(res, 'Kelas not found');
    }

    await kelasService.remove(id);
    return response.ok(res, 'Kelas deleted successfully');
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return response.conflict(res, 'Kelas is still used by member or pertemuan data');
    }

    return response.serverError(res, error.message);
  }
};

module.exports = {
  getAllKelas,
  getKelasById,
  createKelas,
  updateKelas,
  deleteKelas,
};
