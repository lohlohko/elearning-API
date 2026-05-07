const { pool } = require('../config/database');

const baseSelect = `
  SELECT
    l.id,
    l.section_id,
    s.name AS section_name,
    s.department_id,
    d.name AS department_name,
    l.name,
    l.created_at,
    l.updated_at
  FROM \`line\` l
  LEFT JOIN \`section\` s ON s.id = l.section_id
  LEFT JOIN department d ON d.id = s.department_id
`;

const findAll = async () => {
  const [rows] = await pool.query(`${baseSelect} ORDER BY l.id ASC`);
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.query(`${baseSelect} WHERE l.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

const findBySectionAndName = async (sectionId, name) => {
  const [rows] = await pool.query(
    `${baseSelect} WHERE l.section_id = ? AND LOWER(l.name) = LOWER(?) LIMIT 1`,
    [sectionId, name]
  );
  return rows[0] || null;
};

const create = async (payload) => {
  const [result] = await pool.query(
    'INSERT INTO `line` (section_id, name, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    [payload.section_id, payload.name]
  );

  return findById(result.insertId);
};

const update = async (id, payload) => {
  const [result] = await pool.query(
    'UPDATE `line` SET section_id = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [payload.section_id, payload.name, id]
  );

  return { affectedRows: result.affectedRows };
};

const remove = async (id) => {
  const [result] = await pool.query('DELETE FROM `line` WHERE id = ?', [id]);
  return { affectedRows: result.affectedRows };
};

module.exports = {
  findAll,
  findById,
  findBySectionAndName,
  create,
  update,
  remove,
};
