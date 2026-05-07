const { pool } = require('../config/database');

const baseSelect = `
  SELECT
    k.id,
    k.section_id,
    s.name AS section_name,
    s.department_id,
    d.name AS department_name,
    k.created_by,
    a.name AS created_by_name,
    a.npk AS created_by_npk,
    k.nama_kelas,
    k.dari_tanggal,
    k.sampai_tanggal,
    k.status_aktif,
    k.created_at,
    k.updated_at
  FROM \`kelas\` k
  LEFT JOIN \`section\` s ON s.id = k.section_id
  LEFT JOIN department d ON d.id = s.department_id
  LEFT JOIN account a ON a.id = k.created_by
`;

const findAll = async () => {
  const [rows] = await pool.query(`${baseSelect} ORDER BY k.id ASC`);
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.query(`${baseSelect} WHERE k.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

const findBySectionAndName = async (sectionId, name) => {
  const [rows] = await pool.query(
    `${baseSelect} WHERE k.section_id = ? AND LOWER(k.nama_kelas) = LOWER(?) LIMIT 1`,
    [sectionId, name]
  );
  return rows[0] || null;
};

const create = async (payload) => {
  const [result] = await pool.query(
    `
      INSERT INTO \`kelas\` (
        section_id,
        created_by,
        nama_kelas,
        dari_tanggal,
        sampai_tanggal,
        status_aktif,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [
      payload.section_id,
      payload.created_by,
      payload.nama_kelas,
      payload.dari_tanggal,
      payload.sampai_tanggal,
      payload.status_aktif,
    ]
  );

  return findById(result.insertId);
};

const update = async (id, payload) => {
  const [result] = await pool.query(
    `
      UPDATE \`kelas\`
      SET section_id = ?,
          nama_kelas = ?,
          dari_tanggal = ?,
          sampai_tanggal = ?,
          status_aktif = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      payload.section_id,
      payload.nama_kelas,
      payload.dari_tanggal,
      payload.sampai_tanggal,
      payload.status_aktif,
      id,
    ]
  );

  return { affectedRows: result.affectedRows };
};

const remove = async (id) => {
  const [result] = await pool.query('DELETE FROM \`kelas\` WHERE id = ?', [id]);
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
