const bcrypt = require('bcryptjs');
const accountService = require('../services/account.service');
const response = require('../utils/response');

const parseId = (value) => Number.parseInt(value, 10);

const parseOptionalInt = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? NaN : parsed;
};

const normalizeText = (value) => String(value || '').trim();

const normalizeRoleName = (value) => {
  const role = normalizeText(value).toLowerCase();
  return role || undefined;
};

const isValidDateString = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return false;
  }

  return !Number.isNaN(Date.parse(normalized));
};

const mapAccountResponse = (account) => ({
  account_id: account.id,
  npk: account.npk ?? null,
  name: account.name || account.user_name || account.username || null,
  role: 
  {
    id: account.role_id ?? null,
    name: account.role ?? null,
  },
  sub_department: account.sub_department_id ?? null,
  tanggal_lahir: account.tanggal_lahir ?? null,
  created_at: account.created_at ?? null,
  updated_at: account.updated_at ?? null,
});

const getAllAccounts = async (req, res) => {
  try {
    const rows = await accountService.findAll();
    return response.ok(res, 'Accounts retrieved successfully', rows.map(mapAccountResponse));
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const getAccountById = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid account id');
    }

    const account = await accountService.findDetailById(id);
    if (!account) {
      return response.notFound(res, 'Account not found');
    }

    return response.ok(res, 'Account retrieved successfully', mapAccountResponse(account));
  } catch (error) {
    return response.serverError(res, error.message);
  }
};

const createAccount = async (req, res) => {
  try {
    const schema = await accountService.getSchemaMeta();
    const {
      name,
      npk,
      password,
      role,
      sub_department_id,
      tanggal_lahir,
    } = req.body;

    if (!password || !normalizeText(password)) {
      return response.badRequest(res, 'password is required');
    }

    const normalizedName = normalizeText(name);
    if (schema.accountColumns.has('name') && !normalizedName) {
      return response.badRequest(res, 'name is required');
    }

    const normalizedRole = normalizeRoleName(role);
    if (schema.accountColumns.has('role') && !normalizedRole) {
      return response.badRequest(res, 'role is required');
    }

    const parsedNpk = parseOptionalInt(npk);
    if (Number.isNaN(parsedNpk)) {
      return response.badRequest(res, 'npk must be a number');
    }

    if (schema.accountColumns.has('npk') && parsedNpk === undefined) {
      return response.badRequest(res, 'npk is required and must be a number');
    }

    const parsedSubDepartmentId = parseOptionalInt(sub_department_id);
    if (Number.isNaN(parsedSubDepartmentId)) {
      return response.badRequest(res, 'sub_department_id must be a number');
    }

    if (schema.accountColumns.has('sub_department_id') && parsedSubDepartmentId === undefined) {
      return response.badRequest(res, 'sub_department_id is required and must be a number');
    }

    if (tanggal_lahir !== undefined && !normalizeText(tanggal_lahir)) {
      return response.badRequest(res, 'tanggal_lahir cannot be empty');
    }

    if (tanggal_lahir !== undefined && !isValidDateString(tanggal_lahir)) {
      return response.badRequest(res, 'tanggal_lahir must be a valid date');
    }

    // if (schema.accountColumns.has('name')) {
    //   const nameExists = await accountService.findByName(normalizedName);
    //   if (nameExists) {
    //     return response.conflict(res, 'Name already exists');
    //   }
    // }

    if (schema.accountColumns.has('npk')) {
      const npkExists = await accountService.findByNpk(parsedNpk);
      if (npkExists) {
        return response.conflict(res, 'NPK already exists');
      }
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const account = await accountService.create({
      name: normalizedName,
      username: normalizedName,
      npk: parsedNpk,
      password: hashedPassword,
      role: normalizedRole,
      sub_department_id: parsedSubDepartmentId,
      tanggal_lahir: tanggal_lahir ? String(tanggal_lahir).trim() : undefined,
    });

    return response.created(res, 'Account created successfully', mapAccountResponse(account));
  } catch (error) {
    if (error.code === 'ROLE_NOT_FOUND') {
      return response.badRequest(res, 'Role not found');
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return response.badRequest(res, 'Invalid foreign key reference');
    }

    return response.serverError(res, error.message);
  }
};

const updateAccount = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid account id');
    }

    const current = await accountService.findDetailById(id);
    if (!current) {
      return response.notFound(res, 'Account not found');
    }

    const schema = await accountService.getSchemaMeta();
    const {
      name,
      npk,
      password,
      role,
      role_id,
      sub_department_id,
      tanggal_lahir,
    } = req.body;

    const hasNameInput = name !== undefined;
    const normalizedName = hasNameInput ? normalizeText(name) : undefined;
    if (hasNameInput && !normalizedName) {
      return response.badRequest(res, 'name cannot be empty');
    }

    const parsedNpk = parseOptionalInt(npk);
    if (Number.isNaN(parsedNpk)) {
      return response.badRequest(res, 'npk must be a number');
    }

    if (npk !== undefined && parsedNpk === undefined) {
      return response.badRequest(res, 'npk cannot be empty');
    }

    const parsedSubDepartmentId = parseOptionalInt(sub_department_id);
    if (Number.isNaN(parsedSubDepartmentId)) {
      return response.badRequest(res, 'sub_department_id must be a number');
    }

    if (sub_department_id !== undefined && parsedSubDepartmentId === undefined) {
      return response.badRequest(res, 'sub_department_id cannot be empty');
    }

    if (password !== undefined && !normalizeText(password)) {
      return response.badRequest(res, 'password cannot be empty');
    }

    const normalizedRole = role === undefined ? undefined : normalizeRoleName(role);
    if (schema.accountColumns.has('role') && role !== undefined && !normalizedRole) {
      return response.badRequest(res, 'role cannot be empty');
    }

    if (tanggal_lahir !== undefined && !normalizeText(tanggal_lahir)) {
      return response.badRequest(res, 'tanggal_lahir cannot be empty');
    }

    if (tanggal_lahir !== undefined && !isValidDateString(tanggal_lahir)) {
      return response.badRequest(res, 'tanggal_lahir must be a valid date');
    }

    // if (hasNameInput && schema.accountColumns.has('name')) {
    //   const nameExists = await accountService.findByName(normalizedName);
    //   if (nameExists && Number(nameExists.id) !== id) {
    //     return response.conflict(res, 'Name already exists');
    //   }
    // }

    if (npk !== undefined && schema.accountColumns.has('npk')) {
      const npkExists = await accountService.findByNpk(parsedNpk);
      if (npkExists && Number(npkExists.id) !== id) {
        return response.conflict(res, 'NPK already exists');
      }
    }

    const payload = {};

    if (name !== undefined) {
      payload.name = normalizedName;
      payload.username = normalizedName;
    }

    if (npk !== undefined) {
      payload.npk = parsedNpk;
    }

    if (role !== undefined) {
      payload.role = normalizedRole;
    }

    if (sub_department_id !== undefined) {
      payload.sub_department_id = parsedSubDepartmentId;
    }

    if (tanggal_lahir !== undefined) {
      payload.tanggal_lahir = normalizeText(tanggal_lahir) || undefined;
    }

    if (password !== undefined && normalizeText(password)) {
      payload.password = await bcrypt.hash(String(password), 10);
    }

    if (Object.keys(payload).length === 0) {
      return response.badRequest(res, 'No fields provided to update');
    }

    const updated = await accountService.update(id, payload);
    return response.ok(res, 'Account updated successfully', mapAccountResponse(updated));
  } catch (error) {
    if (error.code === 'ROLE_NOT_FOUND') {
      return response.badRequest(res, 'Role not found');
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return response.badRequest(res, 'Invalid foreign key reference');
    } 

    return response.serverError(res, error.message);
  }
};

const deleteAccount = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (Number.isNaN(id)) {
      return response.badRequest(res, 'Invalid account id');
    }

    if (req.auth && Number(req.auth.account_id) === id) {
      return response.forbidden(res, 'You cannot delete your own account');
    }

    const current = await accountService.findDetailById(id);
    if (!current) {
      return response.notFound(res, 'Account not found');
    }

    await accountService.remove(id);
    return response.ok(res, 'Account deleted successfully');
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2'){
      return response.conflict(res, 'Account has related materi and cannot be delted');
    }
    return response.serverError(res, error.message);
  }
};

module.exports = {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
};
