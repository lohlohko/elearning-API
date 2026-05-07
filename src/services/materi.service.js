const { pool } = require('../config/database');

const baseSelect = `
SELECT  
    s.id,
    s.pertemuan_id,
    p.name AS pertemuan_name,
    s.name,
    s.type,
    s.content,
    s.status,
    s.duration,
    s.is_mandatory,
    s.created_by,
    a.name AS account_name,
    a.npk,
    s.created_at,
    s.updated_at
FROM materi s
LEFT JOIN pertemuan p ON p.id = s.pertemuan_id
LEFT JOIN account a ON a.id = s.created_by
`;


const findAll = async () =>{
  const [rows] = await pool.query(`${baseSelect} ORDER BY s.id ASC`);
  return rows;
};
 
const findById = async (id) => {
  const [rows] = await pool.query(
    `
      SELECT id, pertemuan_id, type, name, content, status, duration, compress_progress, is_mandatory, created_by, created_at, updated_at
      FROM materi
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
};

const createMateri = async (payload) => {
  const [result] = await pool.query(
    `
      INSERT INTO materi (
        pertemuan_id,
        type,
        name,
        content,
        status,
        duration,
        is_mandatory,
        created_by,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [
      payload.pertemuan_id,
      payload.type,
      payload.name,
      payload.content,
      payload.status,
      payload.duration,
      payload.is_mandatory ? 1 : 0,
      payload.created_by,
    ]
  );

  return {
    id: result.insertId,
    pertemuan_id: payload.pertemuan_id,
    type: payload.type,
    name: payload.name,
    content: payload.content,
    status: payload.status,
    duration: payload.duration,
    is_mandatory: payload.is_mandatory ? 1 : 0,
    created_by: payload.created_by,
  };
};

const updateMateri = async (id, payload) => {
  const [result] = await pool.query(
    `
      UPDATE materi
      SET status = ?,
          content = ?,
          duration = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [payload.status, payload.content, payload.duration, id]
  );

  return { affectedRows: result.affectedRows };
};

const findProgress = async (accountId, materiId) => {
  const [rows] = await pool.query(
    `
      SELECT id, progress_percent, is_completed, last_position, completed_at
      FROM materi_progress
      WHERE account_id = ? AND materi_id = ?
      LIMIT 1
    `,
    [accountId, materiId]
  );

  return rows[0] || null;
};

const insertProgress = async (payload) => {
  const [result] = await pool.query(
    `
      INSERT INTO materi_progress (
        account_id,
        materi_id,
        progress_percent,
        is_completed,
        last_position,
        completed_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [
      payload.account_id,
      payload.materi_id,
      payload.progress_percent,
      payload.is_completed ? 1 : 0,
      payload.last_position,
      payload.completed_at,
    ]
  );

  return { id: result.insertId };
};

const updateProgress = async (id, payload) => {
  const [result] = await pool.query(
    `
      UPDATE materi_progress
      SET progress_percent = ?,
          is_completed = ?,
          last_position = ?,
          completed_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [
      payload.progress_percent,
      payload.is_completed ? 1 : 0,
      payload.last_position,
      payload.completed_at,
      id,
    ]
  );

  return { affectedRows: result.affectedRows };
};

const updateCompressProgress = async (id, percent) => {
  const [result] = await pool.query(
    'UPDATE materi SET compress_progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [percent, id]
  );
  return { affectedRows: result.affectedRows };
};
module.exports = {
  createMateri,
  findById,
  updateMateri,
  findProgress,
  insertProgress,
  updateProgress,
  findAll,
  updateCompressProgress,
};
