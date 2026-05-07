const roleService = require('../services/role.service');
const response = require('../utils/response');

const parseId = (value) => Number.parseInt(value, 10);

const normalizeRoleName = (value) => String(value || '').trim().toLowerCase();

const getAllRoles = async (req, res) => {
  try {
    const rows = await roleService.findAll();
    return response.ok(res, 'Roles retrieved successfully', rows);
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const getRoleById = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid role id');
    }

    const data = await roleService.findById(id);
    if (!data) {
      return response.notFound(res, 'Role not found');
    }

    return response.ok(res, 'Role retrieved successfully', data);
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const createRole = async (req, res) => {
  try {
    const roleName = normalizeRoleName(req.body.name);
    if (!roleName) {
      return response.badRequest(res, 'Role name is required');
    }

    const existing = await roleService.findByName(roleName);
    if (existing) {
      return response.conflict(res, 'Role name already exists');
    }

    const data = await roleService.create({ name: roleName });
    return response.created(res, 'Role created successfully', data);
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const updateRole = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid role id');
    }

    const roleName = normalizeRoleName(req.body.name);
    if (!roleName) {
      return response.badRequest(res, 'Role name is required');
    }

    const current = await roleService.findById(id);
    if (!current) {
      return response.notFound(res, 'Role not found');
    }

    const existing = await roleService.findByName(roleName);
    if (existing && Number(existing.id) !== id) {
      return response.conflict(res, 'Role name already exists');
    }

    await roleService.update(id, { name: roleName });
    const updated = await roleService.findById(id);
    return response.ok(res, 'Role updated successfully', updated);
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const deleteRole = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid role id');
    }

    const current = await roleService.findById(id);
    if (!current) {
      return response.notFound(res, 'Role not found');
    }

    await roleService.remove(id);
    return response.ok(res, 'Role deleted successfully');
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return response.conflict(res, 'Role is still used by account data');
    }

    return response.serverError(res, error.message);
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};