const { pool } = require('../config/database');

const findAll = async () => {
  const [rows] = await pool.query(
    'SELECT id, name, created_at, updated_at FROM `role` ORDER BY id ASC'
  );

  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.query(
    'SELECT id, name, created_at, updated_at FROM `role` WHERE id = ? LIMIT 1',
    [id]
  );

  return rows[0] || null;
};

const findByName = async (name) => {
  const [rows] = await pool.query(
    'SELECT id, name, created_at, updated_at FROM `role` WHERE LOWER(name) = LOWER(?) LIMIT 1',
    [name]
  );

  return rows[0] || null;
};

const create = async (payload) => {
  const [result] = await pool.query(
    'INSERT INTO `role` (name, created_at, updated_at) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    [payload.name]
  );

  return findById(result.insertId);
};

const update = async (id, payload) => {
  const [result] = await pool.query(
    'UPDATE `role` SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [payload.name, id]
  );

  return { affectedRows: result.affectedRows };
};

const remove = async (id) => {
  const [result] = await pool.query('DELETE FROM `role` WHERE id = ?', [id]);
  return { affectedRows: result.affectedRows };
};

module.exports = {
  findAll,
  findById,
  findByName,
  create,
  update,
  remove,
};