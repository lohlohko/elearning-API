const sectionService = require('../services/section.service');
const response = require('../utils/response');

const parseId = (value) => Number.parseInt(value, 10);
const normalizeText = (value) => String(value || '').trim();

const mapSectionResponse = (row) => ({
  section_id: row.id,
  name: row.name,
  department: {
    id: row.department_id,
    name: row.department_name,
  },
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const getAllSections = async (req, res) => {
  try {
    const rows = await sectionService.findAll();
    return response.ok(res, 'Sections retrieved successfully', rows.map(mapSectionResponse));
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const getSectionById = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid section id');
    }

    const data = await sectionService.findById(id);
    if (!data) {
      return response.notFound(res, 'Section not found');
    }

    return response.ok(res, 'Section retrieved successfully', mapSectionResponse(data));
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const createSection = async (req, res) => {
  try {
    const departmentId = parseId(req.body.department_id);
    if (Number.isNaN(departmentId)) {
      return response.badRequest(res, 'department_id is required and must be a number');
    }

    const name = normalizeText(req.body.name);
    if (!name) {
      return response.badRequest(res, 'Section name is required');
    }

    const existing = await sectionService.findByDepartmentAndName(departmentId, name);
    if (existing) {
      return response.conflict(res, 'Section name already exists in this department');
    }

    const data = await sectionService.create({
      department_id: departmentId,
      name,
    });

    return response.created(res, 'Section created successfully', mapSectionResponse(data));
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return response.badRequest(res, 'department_id does not exist');
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return response.conflict(res, 'Section name already exists in this department');
    }

    return response.serverError(res, error.message);
  }
};

const updateSection = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid section id');
    }

    const current = await sectionService.findById(id);
    if (!current) {
      return response.notFound(res, 'Section not found');
    }

    const departmentId = parseId(req.body.department_id);
    if (Number.isNaN(departmentId)) {
      return response.badRequest(res, 'department_id is required and must be a number');
    }

    const name = normalizeText(req.body.name);
    if (!name) {
      return response.badRequest(res, 'Section name is required');
    }

    const existing = await sectionService.findByDepartmentAndName(departmentId, name);
    if (existing && Number(existing.id) !== id) {
      return response.conflict(res, 'Section name already exists in this department');
    }

    await sectionService.update(id, {
      department_id: departmentId,
      name,
    });

    const updated = await sectionService.findById(id);
    return response.ok(res, 'Section updated successfully', mapSectionResponse(updated));
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return response.badRequest(res, 'Invalid department_id');
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return response.conflict(res, 'Section name already exists in this department');
    }

    return response.serverError(res, error.message);
  }
};

const deleteSection = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid section id');
    }

    const current = await sectionService.findById(id);
    if (!current) {
      return response.notFound(res, 'Section not found');
    }

    await sectionService.remove(id);
    return response.ok(res, 'Section deleted successfully');
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return response.conflict(res, 'Section is still used by line data');
    }

    return response.serverError(res, error.message);
  }
};

module.exports = {
  getAllSections,
  getSectionById,
  createSection,
  updateSection,
  deleteSection,
};
