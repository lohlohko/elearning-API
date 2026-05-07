const pertemuanService = require('../services/pertemuan.service');
const response = require('../utils/response');

const parseId = (value) => Number.parseInt(value, 10);
const normalizeText = (value) => String(value || '').trim();

const mapPertemuanResponse = (row) => ({
	pertemuan_id: row.id,
	name: row.name,
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
	created_at: row.created_at,
	updated_at: row.updated_at,
});

const getAllPertemuan = async (req, res) => {
	try {
		const rows = await pertemuanService.findAll();
		return response.ok(res, 'Pertemuan retrieved successfully', rows.map(mapPertemuanResponse));
	} catch (error) {
		return response.serverError(res, error.message);
	}
};

const getPertemuanById = async (req, res) => {
	try {
		const id = parseId(req.params.id);
		if (Number.isNaN(id)) {
			return response.badRequest(res, 'Invalid pertemuan id');
		}

		const data = await pertemuanService.findById(id);
		if (!data) {
			return response.notFound(res, 'Pertemuan not found');
		}

		return response.ok(res, 'Pertemuan retrieved successfully', mapPertemuanResponse(data));
	} catch (error) {
		return response.serverError(res, error.message);
	}
};

const createPertemuan = async (req, res) => {
	try {
		const kelasId = parseId(req.body.kelas_id);
		if (Number.isNaN(kelasId)) {
			return response.badRequest(res, 'kelas_id is required and must be a number');
		}

		const name = normalizeText(req.body.name);
		if (!name) {
			return response.badRequest(res, 'Pertemuan name is required');
		}

		const existing = await pertemuanService.findByKelasAndName(kelasId, name);
		if (existing) {
			return response.conflict(res, 'Pertemuan name already exists in this kelas');
		}

		const data = await pertemuanService.create({
			kelas_id: kelasId,
			name,
		});

		return response.created(res, 'Pertemuan created successfully', mapPertemuanResponse(data));
	} catch (error) {
		if (error.code === 'ER_NO_REFERENCED_ROW_2') {
			return response.badRequest(res, 'Invalid kelas_id');
		}

		if (error.code === 'ER_DUP_ENTRY') {
			return response.conflict(res, 'Pertemuan name already exists in this kelas');
		}

		return response.serverError(res, error.message);
	}
};

const updatePertemuan = async (req, res) => {
	try {
		const id = parseId(req.params.id);
		if (Number.isNaN(id)) {
			return response.badRequest(res, 'Invalid pertemuan id');
		}

		const current = await pertemuanService.findById(id);
		if (!current) {
			return response.notFound(res, 'Pertemuan not found');
		}

		const kelasId = parseId(req.body.kelas_id);
		if (Number.isNaN(kelasId)) {
			return response.badRequest(res, 'kelas_id is required and must be a number');
		}

		const name = normalizeText(req.body.name);
		if (!name) {
			return response.badRequest(res, 'Pertemuan name is required');
		}

		const existing = await pertemuanService.findByKelasAndName(kelasId, name);
		if (existing && Number(existing.id) !== id) {
			return response.conflict(res, 'Pertemuan name already exists in this kelas');
		}

		await pertemuanService.update(id, {
			kelas_id: kelasId,
			name,
		});

		const updated = await pertemuanService.findById(id);
		return response.ok(res, 'Pertemuan updated successfully', mapPertemuanResponse(updated));
	} catch (error) {
		if (error.code === 'ER_NO_REFERENCED_ROW_2') {
			return response.badRequest(res, 'Invalid kelas_id');
		}

		if (error.code === 'ER_DUP_ENTRY') {
			return response.conflict(res, 'Pertemuan name already exists in this kelas');
		}

		return response.serverError(res, error.message);
	}
};

const deletePertemuan = async (req, res) => {
	try {
		const id = parseId(req.params.id);
		if (Number.isNaN(id)) {
			return response.badRequest(res, 'Invalid pertemuan id');
		}

		const current = await pertemuanService.findById(id);
		if (!current) {
			return response.notFound(res, 'Pertemuan not found');
		}

		await pertemuanService.remove(id);
		return response.ok(res, 'Pertemuan deleted successfully');
	} catch (error) {
		if (error.code === 'ER_ROW_IS_REFERENCED_2') {
			return response.conflict(res, 'Pertemuan is still used by materi data');
		}

		return response.serverError(res, error.message);
	}
};

module.exports = {
	getAllPertemuan,
	getPertemuanById,
	createPertemuan,
	updatePertemuan,
	deletePertemuan,
};
