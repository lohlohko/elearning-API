const { pool } = require('../config/database');

const findAll = async () => {
  const [rows] = await pool.query(
    'SELECT id, name, created_at, updated_at FROM department ORDER BY id ASC'
  );
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.query(
    'SELECT id, name, created_at, updated_at FROM department WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
};

const findByName = async (name) => {
  const [rows] = await pool.query(
    'SELECT id, name, created_at, updated_at FROM department WHERE LOWER(name) = LOWER(?) LIMIT 1',
    [name]
  );

  return rows[0] || null;
};

const create = async (payload) => {
  const [result] = await pool.query(
    'INSERT INTO department (name) VALUES (?)',
    [payload.name]
  );

  return findById(result.insertId);
};

const update = async (id, payload) => {
  const [result] = await pool.query(
    'UPDATE department SET name = ? WHERE id = ?',
    [payload.name, id]
  );

  return { affectedRows: result.affectedRows };
};

const remove = async (id) => {
  const [result] = await pool.query('DELETE FROM department WHERE id = ?', [id]);
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
