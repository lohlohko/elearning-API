const { pool } = require('../config/database');

const baseSelect = `
  SELECT
    km.id,
    km.kelas_id,
    k.nama_kelas,
    k.section_id,
    s.name AS section_name,
    s.department_id,
    d.name AS department_name,
    km.account_id,
    a.name AS account_name,
    a.npk AS account_npk,
    km.joined_at,
    km.is_active,
    km.created_at,
    km.updated_at
  FROM \`kelas_member\` km
  LEFT JOIN \`kelas\` k ON k.id = km.kelas_id
  LEFT JOIN \`section\` s ON s.id = k.section_id
  LEFT JOIN department d ON d.id = s.department_id
  LEFT JOIN account a ON a.id = km.account_id
`;

const findAll = async () => {
  const [rows] = await pool.query(`${baseSelect} ORDER BY km.id ASC`);
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.query(`${baseSelect} WHERE km.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

const findByKelasAndAccount = async (kelasId, accountId) => {
  const [rows] = await pool.query(
    `${baseSelect} WHERE km.kelas_id = ? AND km.account_id = ? LIMIT 1`,
    [kelasId, accountId]
  );
  return rows[0] || null;
};

const create = async (payload) => {
  const [result] = await pool.query(
    `
      INSERT INTO \`kelas_member\` (
        kelas_id,
        account_id,
        joined_at,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [
      payload.kelas_id,
      payload.account_id,
      payload.joined_at,
      payload.is_active,
    ]
  );

  return findById(result.insertId);
};

const update = async (id, payload) => {
  const [result] = await pool.query(
    `
      UPDATE \`kelas_member\`
      SET is_active = ?,
          kelas_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
        payload.is_active,
        payload.kelas_id,
        id
    ]
  );

  return { affectedRows: result.affectedRows };
};

const remove = async (id) => {
  const [result] = await pool.query('DELETE FROM \`kelas_member\` WHERE id = ?', [id]);
  return { affectedRows: result.affectedRows };
};

module.exports = {
  findAll,
  findById,
  findByKelasAndAccount,
  create,
  update,
  remove,
};
