const { pool } = require('../config/database');

async function getAskedQuestionIds(attemptId) {
  if (!attemptId) return [];
  const [rows] = await pool.execute('SELECT question_id FROM aptitude_attempt_questions WHERE attempt_id = ?', [attemptId]);
  return rows.map(r => r.question_id);
}

async function setAskedQuestionIds(attemptId, questionIds = []) {
  if (!attemptId || !questionIds.length) return;
  for (const qId of questionIds) {
    await pool.execute(
      'INSERT IGNORE INTO aptitude_attempt_questions (attempt_id, question_id) VALUES (?, ?)',
      [attemptId, qId]
    );
  }
}

function formatResult(row, askedQuestionIds = []) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    score: row.score || 0,
    totalQuestions: row.total_questions || 15,
    correctAnswers: row.correct_answers || 0,
    wrongAnswers: row.wrong_answers || 0,
    percentage: row.percentage || 0,
    status: row.status || 'FAIL',
    askedQuestionIds: askedQuestionIds,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    save: async function () {
      return await AptitudeResult.saveResult(this);
    }
  };
}

class AptitudeResult {
  static async findOne(query) {
    const userId = query.userId || query.user_id;
    if (!userId) return null;

    const [rows] = await pool.execute('SELECT * FROM aptitude_results WHERE user_id = ? LIMIT 1', [userId]);
    if (rows.length === 0) return null;
    const askedIds = await getAskedQuestionIds(rows[0].id);
    return formatResult(rows[0], askedIds);
  }

  static async create(data) {
    const userId = data.userId || data.user_id;
    const sql = `
      INSERT INTO aptitude_results (
        user_id, score, total_questions, correct_answers, wrong_answers,
        percentage, status, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      userId,
      data.score || 0,
      data.totalQuestions || 15,
      data.correctAnswers || 0,
      data.wrongAnswers || 0,
      data.percentage || 0,
      data.status || 'FAIL',
      data.completedAt || new Date()
    ];

    const [result] = await pool.execute(sql, params);
    const attemptId = result.insertId;

    if (data.askedQuestionIds && data.askedQuestionIds.length > 0) {
      await setAskedQuestionIds(attemptId, data.askedQuestionIds);
    }

    return this.findOne({ userId });
  }

  static async saveResult(resObj) {
    const sql = `
      UPDATE aptitude_results SET
        score = ?,
        total_questions = ?,
        correct_answers = ?,
        wrong_answers = ?,
        percentage = ?,
        status = ?,
        completed_at = ?
      WHERE id = ?
    `;
    const params = [
      resObj.score || 0,
      resObj.totalQuestions || 15,
      resObj.correctAnswers || 0,
      resObj.wrongAnswers || 0,
      resObj.percentage || 0,
      resObj.status || 'FAIL',
      resObj.completedAt || new Date(),
      resObj.id || resObj._id
    ];

    await pool.execute(sql, params);

    if (resObj.askedQuestionIds && resObj.askedQuestionIds.length > 0) {
      await setAskedQuestionIds(resObj.id || resObj._id, resObj.askedQuestionIds);
    }

    return this.findOne({ userId: resObj.userId });
  }

  static async countDocuments(query = {}) {
    let sql = 'SELECT COUNT(*) as count FROM aptitude_results';
    const params = [];

    if (query.status) {
      sql += ' WHERE status = ?';
      params.push(query.status);
    }

    const [rows] = await pool.execute(sql, params);
    return rows[0].count;
  }

  static async getAveragePercentage() {
    const [rows] = await pool.execute('SELECT AVG(percentage) as avgPercentage FROM aptitude_results');
    return rows[0].avgPercentage ? Math.round(rows[0].avgPercentage) : 0;
  }
}

module.exports = AptitudeResult;
