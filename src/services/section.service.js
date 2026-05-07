const { pool } = require('../config/database');

const baseSelect = `
  SELECT
    s.id,
    s.department_id,
    d.name AS department_name,
    s.name,
    s.created_at,
    s.updated_at
  FROM \`section\` s
  LEFT JOIN department d ON d.id = s.department_id
`;

const findAll = async () => {
  const [rows] = await pool.query(`${baseSelect} ORDER BY s.id ASC`);
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.query(`${baseSelect} WHERE s.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

const findByDepartmentAndName = async (departmentId, name) => {
  const [rows] = await pool.query(
    `${baseSelect} WHERE s.department_id = ? AND LOWER(s.name) = LOWER(?) LIMIT 1`,
    [departmentId, name]
  );
  return rows[0] || null;
};

const create = async (payload) => {
  const [result] = await pool.query(
    'INSERT INTO `section` (department_id, name, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    [payload.department_id, payload.name]
  );

  return findById(result.insertId);
};

const update = async (id, payload) => {
  const [result] = await pool.query(
    'UPDATE `section` SET department_id = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [payload.department_id, payload.name, id]
  );

  return { affectedRows: result.affectedRows };
};

const remove = async (id) => {
  const [result] = await pool.query('DELETE FROM `section` WHERE id = ?', [id]);
  return { affectedRows: result.affectedRows };
};

module.exports = {
  findAll,
  findById,
  findByDepartmentAndName,
  create,
  update,
  remove,
};
