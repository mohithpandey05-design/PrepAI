const { pool } = require('../config/database');

const CATEGORIES = ['Introduction', 'Technical', 'Behavioral', 'Project', 'Closing', 'Follow-up'];

function normalizeCategory(category) {
  const match = CATEGORIES.find(c => c.toLowerCase() === String(category || '').trim().toLowerCase());
  return match || 'Technical';
}

function formatQuestion(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    sessionId: row.session_id,
    question: row.question,
    category: row.category,
    difficulty: row.difficulty || 'Medium',
    isAnswered: Boolean(row.is_answered),
    prepSeconds: row.prep_seconds || 30,
    answerSeconds: row.answer_seconds || 120,
    order: row.order_num || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

class InterviewQuestion {
  static async findById(id) {
    if (!id) return null;
    const [rows] = await pool.execute('SELECT * FROM interview_questions WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return formatQuestion(rows[0]);
  }

  static async findBySessionId(sessionId) {
    if (!sessionId) return [];
    const [rows] = await pool.execute(
      'SELECT * FROM interview_questions WHERE session_id = ? ORDER BY order_num ASC, id ASC',
      [sessionId]
    );
    return rows.map(formatQuestion);
  }

  static async create(data) {
    const sessionId = data.sessionId || data.session_id;
    const sql = `
      INSERT INTO interview_questions
        (session_id, question, category, difficulty, is_answered, prep_seconds, answer_seconds, order_num)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      sessionId,
      data.question,
      normalizeCategory(data.category),
      data.difficulty || 'Medium',
      data.isAnswered ? 1 : 0,
      data.prepSeconds || 30,
      data.answerSeconds || 120,
      data.order || 0
    ];

    const [result] = await pool.execute(sql, params);
    return this.findById(result.insertId);
  }

  static async markAnswered(id) {
    if (!id) return;
    await pool.execute('UPDATE interview_questions SET is_answered = 1 WHERE id = ?', [id]);
  }
}

module.exports = InterviewQuestion;
module.exports.CATEGORIES = CATEGORIES;
module.exports.normalizeCategory = normalizeCategory;
