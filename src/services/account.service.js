const { pool } = require('../config/database');

let schemaMetaPromise = null;

const getTableColumns = async (tableName) => {
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${tableName}\``);
  return new Set(rows.map((row) => row.Field));
};

const tableExists = async (tableName) => {
  const [rows] = await pool.query('SHOW TABLES LIKE ?', [tableName]);
  return rows.length > 0;
};

const loadSchemaMeta = async () => {
  const accountColumns = await getTableColumns('account');

  const hasRoleTable = accountColumns.has('role_id') && await tableExists('role');
  const roleColumns = hasRoleTable ? await getTableColumns('role') : new Set();

  const hasUserTable = accountColumns.has('user_id') && await tableExists('user');
  const userColumns = hasUserTable ? await getTableColumns('user') : new Set();

  const hasDepartmentsTable = hasUserTable && userColumns.has('department_id') && await tableExists('departments');
  const departmentsColumns = hasDepartmentsTable ? await getTableColumns('departments') : new Set();

  return {
    accountColumns,
    hasRoleTable,
    roleColumns,
    hasUserTable,
    userColumns,
    hasDepartmentsTable,
    departmentsColumns,
  };
};

const getSchemaMeta = async () => {
  if (!schemaMetaPromise) {
    schemaMetaPromise = loadSchemaMeta();
  }

  return schemaMetaPromise;
};

const findRoleIdByName = async (roleName) => {
  const [rows] = await pool.query(
    'SELECT id FROM role WHERE LOWER(name) = LOWER(?) LIMIT 1',
    [roleName]
  );

  return rows[0] ? Number(rows[0].id) : null;
};

const resolveRoleIdForWrite = async (meta, payload) => {
  if (!meta.accountColumns.has('role_id')) {
    return undefined;
  }

  if (payload.role_id !== undefined) {
    return payload.role_id;
  }

  if (payload.role && meta.hasRoleTable) {
    const roleId = await findRoleIdByName(payload.role);
    if (roleId === null) {
      const error = new Error('Role not found');
      error.code = 'ROLE_NOT_FOUND';
      throw error;
    }

    return roleId;
  }

  return undefined;
};

const buildWriteData = async (payload, meta) => {
  const data = {};

  if (meta.accountColumns.has('user_id') && payload.user_id !== undefined) {
    data.user_id = payload.user_id;
  }

  if (meta.accountColumns.has('username')) {
    const usernameValue = payload.username !== undefined
      ? payload.username
      : (payload.name !== undefined ? payload.name : payload.npk);

    if (usernameValue !== undefined) {
      data.username = String(usernameValue).trim();
    }
  }

  if (meta.accountColumns.has('name')) {
    const nameValue = payload.name !== undefined
      ? payload.name
      : payload.username;

    if (nameValue !== undefined) {
      data.name = String(nameValue).trim();
    }
  }

  if (meta.accountColumns.has('npk') && payload.npk !== undefined) {
    data.npk = payload.npk;
  }

  if (meta.accountColumns.has('password') && payload.password !== undefined) {
    data.password = payload.password;
  }

  if (meta.accountColumns.has('role') && payload.role !== undefined) {
    data.role = String(payload.role).trim().toLowerCase();
  }

  const resolvedRoleId = await resolveRoleIdForWrite(meta, payload);
  if (resolvedRoleId !== undefined) {
    data.role_id = resolvedRoleId;
  }

  if (meta.accountColumns.has('sub_department_id') && payload.sub_department_id !== undefined) {
    data.sub_department_id = payload.sub_department_id;
  }

  if (meta.accountColumns.has('tanggal_lahir') && payload.tanggal_lahir !== undefined) {
    data.tanggal_lahir = payload.tanggal_lahir;
  }

  return data;
};

const getUsernameSelectExpr = (meta) => {
  if (meta.accountColumns.has('username')) {
    return 'a.username';
  }

  if (meta.accountColumns.has('name')) {
    return 'a.name';
  }

  if (meta.accountColumns.has('npk')) {
    return 'CAST(a.npk AS CHAR)';
  }

  return 'NULL';
};

const getUsernameWhereExpr = (meta) => {
  if (meta.accountColumns.has('username')) {
    return 'a.username';
  }

  if (meta.accountColumns.has('name')) {
    return 'a.name';
  }

  if (meta.accountColumns.has('npk')) {
    return 'CAST(a.npk AS CHAR)';
  }

  return null;
};

const getRoleExpr = (meta) => {
  if (meta.accountColumns.has('role')) {
    return 'a.role';
  }

  if (meta.accountColumns.has('role_id') && meta.hasRoleTable && meta.roleColumns.has('name')) {
    return 'r.name';
  }

  return 'NULL';
};

const getUserNameExpr = (meta) => {
  if (meta.hasUserTable && meta.userColumns.has('name')) {
    return 'u.name';
  }

  if (meta.accountColumns.has('name')) {
    return 'a.name';
  }

  return 'NULL';
};

const getDepartmentIdExpr = (meta) => {
  if (meta.hasUserTable && meta.userColumns.has('department_id')) {
    return 'u.department_id';
  }

  if (meta.accountColumns.has('sub_department_id')) {
    return 'a.sub_department_id';
  }

  return 'NULL';
};

const getDepartmentNameExpr = (meta) => {
  if (meta.hasDepartmentsTable && meta.departmentsColumns.has('name')) {
    return 'd.name';
  }

  return 'NULL';
};

const getTokenVersionExpr = (meta) => (
  meta.accountColumns.has('token_version') ? 'a.token_version' : '0'
);

const buildOptionalJoins = (meta) => {
  const joins = [];

  if (meta.hasRoleTable) {
    joins.push('LEFT JOIN role r ON r.id = a.role_id');
  }

  if (meta.hasUserTable) {
    joins.push('LEFT JOIN `user` u ON u.id = a.user_id');
  }

  if (meta.hasDepartmentsTable) {
    joins.push('LEFT JOIN departments d ON d.id = u.department_id');
  }

  return joins.join('\n  ');
};

const buildAccountSelect = async () => {
  const meta = await getSchemaMeta();
  const optionalJoins = buildOptionalJoins(meta);

  const select = `
    SELECT
      a.id,
      ${meta.accountColumns.has('role_id') ? 'a.role_id' : 'NULL'} AS role_id,
      ${meta.accountColumns.has('npk') ? 'a.npk' : 'NULL'} AS npk,
      ${meta.accountColumns.has('name') ? 'a.name' : 'NULL'} AS name,
      ${meta.accountColumns.has('sub_department_id') ? 'a.sub_department_id' : 'NULL'} AS sub_department_id,
      ${meta.accountColumns.has('tanggal_lahir') ? 'a.tanggal_lahir' : 'NULL'} AS tanggal_lahir,
      ${meta.accountColumns.has('user_id') ? 'a.user_id' : 'NULL'} AS user_id,
      ${getUsernameSelectExpr(meta)} AS username,
      ${getRoleExpr(meta)} AS role,
      ${getTokenVersionExpr(meta)} AS token_version,
      a.created_at,
      a.updated_at,
      ${getUserNameExpr(meta)} AS user_name,
      ${meta.hasUserTable && meta.userColumns.has('phone') ? 'u.phone' : 'NULL'} AS phone,
      ${meta.hasUserTable && meta.userColumns.has('email') ? 'u.email' : 'NULL'} AS email,
      ${getDepartmentIdExpr(meta)} AS department_id,
      ${getDepartmentNameExpr(meta)} AS department_name
    FROM account a
    ${optionalJoins ? `  ${optionalJoins}` : ''}
  `;

  return { select, meta };
};

const buildAccountDetailSelect = (meta) => {
  const optionalJoins = buildOptionalJoins(meta);

  return `
    SELECT
      a.id,
      ${meta.accountColumns.has('role_id') ? 'a.role_id' : 'NULL'} AS role_id,
      ${meta.accountColumns.has('npk') ? 'a.npk' : 'NULL'} AS npk,
      ${meta.accountColumns.has('name') ? 'a.name' : 'NULL'} AS name,
      ${meta.accountColumns.has('sub_department_id') ? 'a.sub_department_id' : 'NULL'} AS sub_department_id,
      ${meta.accountColumns.has('tanggal_lahir') ? 'a.tanggal_lahir' : 'NULL'} AS tanggal_lahir,
      ${meta.accountColumns.has('user_id') ? 'a.user_id' : 'NULL'} AS user_id,
      ${getUsernameSelectExpr(meta)} AS username,
      a.password,
      ${getRoleExpr(meta)} AS role,
      ${getTokenVersionExpr(meta)} AS token_version,
      ${getUserNameExpr(meta)} AS user_name,
      ${getDepartmentIdExpr(meta)} AS department_id,
      ${getDepartmentNameExpr(meta)} AS department_name,
      a.created_at,
      a.updated_at
    FROM account a
    ${optionalJoins ? `  ${optionalJoins}` : ''}
  `;
};

const findAll = async () => {
  const { select } = await buildAccountSelect();
  const [rows] = await pool.query(`${select} ORDER BY a.id ASC`);
  return rows;
};

const findDetailById = async (id) => {
  const { select } = await buildAccountSelect();
  const [rows] = await pool.query(`${select} WHERE a.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

const findByUsername = async (username) => {
  const { meta } = await buildAccountSelect();
  const usernameWhereExpr = getUsernameWhereExpr(meta);

  if (!usernameWhereExpr) {
    return null;
  }

  const detailSelect = buildAccountDetailSelect(meta);
  const [rows] = await pool.query(
    `${detailSelect} WHERE ${usernameWhereExpr} = ? LIMIT 1`,
    [username]
  );

  return rows[0] || null;
};

const findById = async (id) => {
  const { meta } = await buildAccountSelect();
  const detailSelect = buildAccountDetailSelect(meta);

  const [rows] = await pool.query(
    `${detailSelect} WHERE a.id = ? LIMIT 1`,
    [id]
  );

  return rows[0] || null;
};

const findByName = async (name) => {
  const { meta } = await buildAccountSelect();
  if (!meta.accountColumns.has('name')) {
    return null;
  }

  const detailSelect = buildAccountDetailSelect(meta);
  const [rows] = await pool.query(`${detailSelect} WHERE a.name = ? LIMIT 1`, [name]);
  return rows[0] || null;
};

const findByNpk = async (npk) => {
  const { meta } = await buildAccountSelect();
  if (!meta.accountColumns.has('npk')) {
    return null;
  }

  const detailSelect = buildAccountDetailSelect(meta);
  const [rows] = await pool.query(`${detailSelect} WHERE a.npk = ? LIMIT 1`, [npk]);
  return rows[0] || null;
};

const updatePasswordHash = async (id, hashedPassword) => {
  await pool.query(
    'UPDATE account SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [hashedPassword, id]
  );
};

const getTokenVersionByAccountId = async (id) => {
  const meta = await getSchemaMeta();
  if (!meta.accountColumns.has('token_version')) {
    return 0;
  }

  const [rows] = await pool.query(
    'SELECT token_version FROM account WHERE id = ? LIMIT 1',
    [id]
  );

  if (!rows[0]) {
    return null;
  }

  return Number(rows[0].token_version);
};

const incrementTokenVersion = async (id) => {
  const meta = await getSchemaMeta();
  if (!meta.accountColumns.has('token_version')) {
    return;
  }

  await pool.query(
    'UPDATE account SET token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
};

const create = async (payload) => {
  const meta = await getSchemaMeta();
  const data = await buildWriteData(payload, meta);

  const columns = [];
  const placeholders = [];
  const values = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      columns.push(`\`${key}\``);
      placeholders.push('?');
      values.push(value);
    }
  });

  if (meta.accountColumns.has('created_at')) {
    columns.push('created_at');
    placeholders.push('CURRENT_TIMESTAMP');
  }

  if (meta.accountColumns.has('updated_at')) {
    columns.push('updated_at');
    placeholders.push('CURRENT_TIMESTAMP');
  }

  const [result] = await pool.query(
    `INSERT INTO account (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
    values
  );

  return findDetailById(result.insertId);
};

const update = async (id, payload) => {
  const meta = await getSchemaMeta();
  const data = await buildWriteData(payload, meta);

  const setClauses = [];
  const values = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      setClauses.push(`\`${key}\` = ?`);
      values.push(value);
    }
  });

  if (meta.accountColumns.has('updated_at')) {
    setClauses.push('updated_at = CURRENT_TIMESTAMP');
  }

  if (setClauses.length > 0) {
    values.push(id);
    await pool.query(
      `UPDATE account SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );
  }

  return findDetailById(id);
};

const remove = async (id) => {
  const [result] = await pool.query('DELETE FROM account WHERE id = ?', [id]);
  return { affectedRows: result.affectedRows };
};

module.exports = {
  getSchemaMeta,
  findAll,
  findDetailById,
  findByUsername,
  findByName,
  findByNpk,
  findById,
  updatePasswordHash,
  getTokenVersionByAccountId,
  incrementTokenVersion,
  create,
  update,
  remove,
};
