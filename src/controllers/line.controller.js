const lineService = require('../services/line.service');
const response = require('../utils/response');

const parseId = (value) => Number.parseInt(value, 10);
const normalizeText = (value) => String(value || '').trim();

const mapLineResponse = (row) => ({
  line_id: row.id,
  name: row.name,
  section: {
    id: row.section_id,
    name: row.section_name,
  },
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const getAllLines = async (req, res) => {
  try {
    const rows = await lineService.findAll();
    return response.ok(res, 'Lines retrieved successfully', rows.map(mapLineResponse));
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const getLineById = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid line id');
    }

    const data = await lineService.findById(id);
    if (!data) {
      return response.notFound(res, 'Line not found');
    }

    return response.ok(res, 'Line retrieved successfully', mapLineResponse(data));
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const createLine = async (req, res) => {
  try {
    const sectionId = parseId(req.body.section_id);
    if (Number.isNaN(sectionId)) {
      return response.badRequest(res, 'section_id is required and must be a number');
    }

    const name = normalizeText(req.body.name);
    if (!name) {
      return response.badRequest(res, 'Line name is required');
    }

    const existing = await lineService.findBySectionAndName(sectionId, name);
    if (existing) {
      return response.conflict(res, 'Line name already exists in this section');
    }

    const data = await lineService.create({
      section_id: sectionId,
      name,
    });

    return response.created(res, 'Line created successfully', mapLineResponse(data));
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return response.badRequest(res, 'Invalid section_id');
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return response.conflict(res, 'Line name already exists in this section');
    }

    return response.serverError(res, error.message);
  }
};

const updateLine = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid line id');
    }

    const current = await lineService.findById(id);
    if (!current) {
      return response.notFound(res, 'Line not found');
    }

    const sectionId = parseId(req.body.section_id);
    if (Number.isNaN(sectionId)) {
      return response.badRequest(res, 'section_id is required and must be a number');
    }

    const name = normalizeText(req.body.name);
    if (!name) {
      return response.badRequest(res, 'Line name is required');
    }

    const existing = await lineService.findBySectionAndName(sectionId, name);
    if (existing && Number(existing.id) !== id) {
      return response.conflict(res, 'Line name already exists in this section');
    }

    await lineService.update(id, {
      section_id: sectionId,
      name,
    });

    const updated = await lineService.findById(id);
    return response.ok(res, 'Line updated successfully', mapLineResponse(updated));
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return response.badRequest(res, 'Invalid section_id');
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return response.conflict(res, 'Line name already exists in this section');
    }

    return response.serverError(res, error.message);
  }
};

const deleteLine = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid line id');
    }

    const current = await lineService.findById(id);
    if (!current) {
      return response.notFound(res, 'Line not found');
    }

    await lineService.remove(id);
    return response.ok(res, 'Line deleted successfully');
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

module.exports = {
  getAllLines,
  getLineById,
  createLine,
  updateLine,
  deleteLine,
};
