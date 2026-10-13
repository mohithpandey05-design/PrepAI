const { pool } = require('../config/database');

function formatCodingResult(row) {
  if (!row) return null;

  const questionIdObj = row.q_title ? {
    _id: row.question_id,
    id: row.question_id,
    title: row.q_title,
    difficulty: row.q_difficulty
  } : row.question_id;

  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    questionId: questionIdObj,
    language: row.language || '',
    submittedCode: row.submitted_code || '',
    passedTestCases: row.passed_test_cases || 0,
    totalTestCases: row.total_test_cases || 0,
    score: row.score || 0,
    status: row.status || 'FAIL',
    executionTime: row.execution_time || '',
    memory: row.memory || '',
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    save: async function () {
      return await CodingResult.saveResult(this);
    }
  };
}

class CodingResult {
  static async findOne(query) {
    const userId = query.userId || query.user_id;
    const questionId = query.questionId || query.question_id;

    if (!userId || !questionId) return null;

    const sql = 'SELECT * FROM coding_results WHERE user_id = ? AND question_id = ? LIMIT 1';
    const [rows] = await pool.execute(sql, [userId, questionId]);

    if (rows.length === 0) return null;
    return formatCodingResult(rows[0]);
  }

  static async find(query = {}) {
    const userId = query.userId || query.user_id;
    let sql = `
      SELECT c.*, q.title as q_title, q.difficulty as q_difficulty
      FROM coding_results c
      LEFT JOIN coding_questions q ON c.question_id = q.id
    `;
    const params = [];

    if (userId) {
      sql += ' WHERE c.user_id = ?';
      params.push(userId);
    }

    sql += ' ORDER BY c.created_at DESC';

    const [rows] = await pool.execute(sql, params);
    return rows.map(formatCodingResult);
  }

  static async create(data) {
    const userId = data.userId || data.user_id;
    const questionId = data.questionId || data.question_id;

    const sql = `
      INSERT INTO coding_results (
        user_id, question_id, language, submitted_code, passed_test_cases,
        total_test_cases, score, status, execution_time, memory, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      userId,
      questionId,
      data.language || '',
      data.submittedCode || '',
      data.passedTestCases || 0,
      data.totalTestCases || 0,
      data.score || 0,
      data.status || 'FAIL',
      data.executionTime || '',
      data.memory || '',
      data.submittedAt || new Date()
    ];

    await pool.execute(sql, params);
    return this.findOne({ userId, questionId });
  }

  static async saveResult(resObj) {
    const qId = typeof resObj.questionId === 'object' ? resObj.questionId._id || resObj.questionId.id : resObj.questionId;

    const sql = `
      UPDATE coding_results SET
        language = ?,
        submitted_code = ?,
        passed_test_cases = ?,
        total_test_cases = ?,
        score = ?,
        status = ?,
        execution_time = ?,
        memory = ?,
        submitted_at = ?
      WHERE id = ?
    `;

    const params = [
      resObj.language || '',
      resObj.submittedCode || '',
      resObj.passedTestCases || 0,
      resObj.totalTestCases || 0,
      resObj.score || 0,
      resObj.status || 'FAIL',
      resObj.executionTime || '',
      resObj.memory || '',
      resObj.submittedAt || new Date(),
      resObj.id || resObj._id
    ];

    await pool.execute(sql, params);
    return this.findOne({ userId: resObj.userId, questionId: qId });
  }

  static async countDocuments(query = {}) {
    let sql = 'SELECT COUNT(*) as count FROM coding_results';
    const clauses = [];
    const params = [];

    if (query.status) {
      clauses.push('status = ?');
      params.push(query.status);
    }

    if (clauses.length > 0) {
      sql += ' WHERE ' + clauses.join(' AND ');
    }

    const [rows] = await pool.execute(sql, params);
    return rows[0].count;
  }
}

module.exports = CodingResult;
