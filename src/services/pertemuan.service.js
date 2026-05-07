const { pool } = require('../config/database');

const baseSelect = `
  SELECT
    p.id,
    p.kelas_id,
    k.nama_kelas,
    k.section_id,
    s.name AS section_name,
    s.department_id,
    d.name AS department_name,
    p.name,
    p.created_at,
    p.updated_at
  FROM \`pertemuan\` p
  LEFT JOIN \`kelas\` k ON k.id = p.kelas_id
  LEFT JOIN \`section\` s ON s.id = k.section_id
  LEFT JOIN department d ON d.id = s.department_id
`;

const findAll = async () => {
  const [rows] = await pool.query(`${baseSelect} ORDER BY p.id ASC`);
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.query(`${baseSelect} WHERE p.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

const findByKelasAndName = async (kelasId, name) => {
  const [rows] = await pool.query(
    `${baseSelect} WHERE p.kelas_id = ? AND LOWER(p.name) = LOWER(?) LIMIT 1`,
    [kelasId, name]
  );
  return rows[0] || null;
};

const create = async (payload) => {
  const [result] = await pool.query(
    'INSERT INTO `pertemuan` (kelas_id, name, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    [payload.kelas_id, payload.name]
  );

  return findById(result.insertId);
};

const update = async (id, payload) => {
  const [result] = await pool.query(
    'UPDATE `pertemuan` SET kelas_id = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [payload.kelas_id, payload.name, id]
  );

  return { affectedRows: result.affectedRows };
};

const remove = async (id) => {
  const [result] = await pool.query('DELETE FROM `pertemuan` WHERE id = ?', [id]);
  return { affectedRows: result.affectedRows };
};

module.exports = {
  findAll,
  findById,
  findByKelasAndName,
  create,
  update,
  remove,
};
