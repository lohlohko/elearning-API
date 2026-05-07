const kelasMemberService = require('../services/kelasMember.service');
const response = require('../utils/response');

const parseId = (value) => Number.parseInt(value, 10);

const toBoolInt = (value, defaultValue = 1) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed ? 1 : 0;
};

const mapKelasMemberResponse = (row) => ({
  kelas_member_id: row.id,
  kelas: {
    id: row.kelas_id,
    nama_kelas: row.nama_kelas,
    section: {
      id: row.section_id,
      name: row.section_name,
      department: {
        id: row.department_id,
        name: row.department_name,
      },
    },
  },
  member: {
    account_id: row.account_id,
    name: row.account_name,
    npk: row.account_npk,
  },
  joined_at: row.joined_at,
  is_active: row.is_active,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const getAllKelasMembers = async (req, res) => {
  try {
    const rows = await kelasMemberService.findAll();
    return response.ok(res, 'Kelas members retrieved successfully', rows.map(mapKelasMemberResponse));
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const getKelasMemberById = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid kelas member id');
    }

    const data = await kelasMemberService.findById(id);
    if (!data) {
      return response.notFound(res, 'Kelas member not found');
    }

    return response.ok(res, 'Kelas member retrieved successfully', mapKelasMemberResponse(data));
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const createKelasMember = async (req, res) => {
  try {
    const kelasId = parseId(req.body.kelas_id);
    if (Number.isNaN(kelasId)) {
      return response.badRequest(res, 'kelas_id is required and must be a number');
    }

    const accountId = parseId(req.body.account_id);
    if (Number.isNaN(accountId)) {
      return response.badRequest(res, 'account_id is required and must be a number');
    }

    const isActive = toBoolInt(req.body.is_active, 1);
    if (isActive === undefined) {
      return response.badRequest(res, 'is_active must be 0 or 1');
    }

    const joinedAt = req.body.joined_at ? new Date(req.body.joined_at) : new Date();
    if (Number.isNaN(joinedAt.getTime())) {
      return response.badRequest(res, 'joined_at must be a valid date');
    }

    const existing = await kelasMemberService.findByKelasAndAccount(kelasId, accountId);
    if (existing) {
      return response.conflict(res, 'Account already joined this kelas');
    }

    const data = await kelasMemberService.create({
      kelas_id: kelasId,
      account_id: accountId,
      joined_at: joinedAt,
      is_active: isActive,
    });

    return response.created(res, 'Kelas member created successfully', mapKelasMemberResponse(data));
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return response.badRequest(res, 'Invalid foreign key');
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return response.conflict(res, 'Account already joined this kelas');
    }

    return response.serverError(res, error.message);
  }
};

const updateKelasMember = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid kelas member id');
    }

     const kelasId = parseId(req.body.kelas_id);
    if (Number.isNaN(kelasId)) {
      return response.badRequest(res, 'kelas_id is required and must be a number');
    }

    const current = await kelasMemberService.findById(id);
    if (!current) {
      return response.notFound(res, 'Kelas member not found');
    }

    const isActive = toBoolInt(req.body.is_active, current.is_active);
    if (isActive === undefined) {
      return response.badRequest(res, 'is_active must be 0 or 1');
    }

    await kelasMemberService.update(id, { 
        is_active: isActive,
        kelas_id: kelasId,
    });

    const updated = await kelasMemberService.findById(id);
    return response.ok(res, 'Kelas member updated successfully', mapKelasMemberResponse(updated));
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const deleteKelasMember = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid kelas member id');
    }

    const current = await kelasMemberService.findById(id);
    if (!current) {
      return response.notFound(res, 'Kelas member not found');
    }

    await kelasMemberService.remove(id);
    return response.ok(res, 'Kelas member deleted successfully');
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

module.exports = {
  getAllKelasMembers,
  getKelasMemberById,
  createKelasMember,
  updateKelasMember,
  deleteKelasMember,
};
