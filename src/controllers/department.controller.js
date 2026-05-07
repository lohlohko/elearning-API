const departmentService = require('../services/department.service');
const response = require('../utils/response');

const parseId = (value) => Number.parseInt(value, 10);

const getAllDepartments = async (req, res) => {
  try {
    const rows = await departmentService.findAll();
    return response.ok(res, 'Departments retrieved successfully', rows);
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const getDepartmentById = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid department id');
    }

    const data = await departmentService.findById(id);
    if (!data) {
      return response.notFound(res, 'Department not found');
    }

    return response.ok(res, 'Department retrieved successfully', data);
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return response.badRequest(res, 'Department name is required');
    }

    const normalizedName = String(name).trim();
    const existing = await departmentService.findByName(normalizedName);
    if (existing) {
      return response.conflict(res, 'Department already exists');
    }

    const data = await departmentService.create({ name: normalizedName });
    return response.created(res, 'Department created successfully', data);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return response.conflict(res, 'Department already exists');
    }

    return response.serverError(res, error.message);
  }
};

const updateDepartment = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid department id');
    }

    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return response.badRequest(res, 'Department name is required');
    }

    const normalizedName = String(name).trim();

    const current = await departmentService.findById(id);
    if (!current) {
      return response.notFound(res, 'Department not found');
    }

    const existing = await departmentService.findByName(normalizedName);
    if (existing && Number(existing.id) !== id) {
      return response.conflict(res, 'Department already exists');
    }

    await departmentService.update(id, { name: normalizedName });
    const updated = await departmentService.findById(id);
    return response.ok(res, 'Department updated successfully', updated);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return response.conflict(res, 'Department already exists');
    }

    return response.serverError(res, error.message);
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid department id');
    }

    const current = await departmentService.findById(id);
    if (!current) {
      return response.notFound(res, 'Department not found');
    }

    await departmentService.remove(id);
    return response.ok(res, 'Department deleted successfully');
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
