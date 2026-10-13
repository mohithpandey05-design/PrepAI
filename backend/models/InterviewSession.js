const { pool } = require('../config/database');

function parseJson(val, defaultVal = []) {
  if (!val) return defaultVal;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (e) { return defaultVal; }
  }
  return val;
}

function formatSession(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id || String(row.id),
    startedAt: row.started_at,
    endedAt: row.ended_at || null,
    durationMinutes: row.duration || 0,
    status: row.status || 'IN_PROGRESS',
    conversationHistory: parseJson(row.conversation_history, []),
    overallScore: row.overall_score || 0,
    totalQuestions: row.total_questions || 0,
    totalQuestionsAsked: row.total_questions_asked || 0,
    meaningfulAnswersCount: row.meaningful_answers_count || 0,
    categoryScores: parseJson(row.category_scores, { technical: 0, communication: 0, problemSolving: 0, confidence: 0, relevance: 0 }),
    strengths: parseJson(row.strengths, []),
    weaknesses: parseJson(row.weaknesses, []),
    improvementSuggestions: parseJson(row.improvement_suggestions, []),
    recommendedLearningPath: parseJson(row.recommended_learning_path, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    save: async function () {
      return await InterviewSession.saveSession(this);
    }
  };
}

class InterviewSession {
  static async findById(id) {
    if (!id) return null;
    const [rows] = await pool.execute('SELECT * FROM interview_sessions WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return formatSession(rows[0]);
  }

  static async findOne(query, options = {}) {
    let sql = 'SELECT * FROM interview_sessions WHERE 1=1';
    const params = [];

    if (query._id || query.id) {
      sql += ' AND id = ?';
      params.push(query._id || query.id);
    }
    if (query.userId || query.user_id) {
      sql += ' AND user_id = ?';
      params.push(query.userId || query.user_id);
    }
    if (query.status) {
      sql += ' AND status = ?';
      params.push(query.status);
    }

    if (options.sort || query.sort) {
      sql += ' ORDER BY created_at DESC';
    } else {
      sql += ' ORDER BY created_at DESC';
    }

    sql += ' LIMIT 1';

    const [rows] = await pool.execute(sql, params);
    if (rows.length === 0) return null;
    return formatSession(rows[0]);
  }

  static async updateMany(filter, update) {
    let sql = 'UPDATE interview_sessions SET status = ?, ended_at = ? WHERE user_id = ? AND status = ?';
    const params = [
      update.status,
      update.endedAt ? new Date(update.endedAt) : new Date(),
      filter.userId || filter.user_id,
      filter.status
    ];
    await pool.execute(sql, params);
  }

  static async create(data) {
    const userId = data.userId || data.user_id;
    const sql = `
      INSERT INTO interview_sessions (
        user_id, session_id, started_at, status, conversation_history,
        overall_score, total_questions, total_questions_asked, meaningful_answers_count, category_scores,
        strengths, weaknesses, improvement_suggestions, recommended_learning_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      userId,
      data.sessionId || null,
      data.startedAt || new Date(),
      data.status || 'IN_PROGRESS',
      typeof data.conversationHistory === 'string' ? data.conversationHistory : JSON.stringify(data.conversationHistory || []),
      data.overallScore || 0,
      data.totalQuestions || 0,
      data.totalQuestionsAsked || 0,
      data.meaningfulAnswersCount || 0,
      typeof data.categoryScores === 'string' ? data.categoryScores : JSON.stringify(data.categoryScores || {}),
      JSON.stringify(data.strengths || []),
      JSON.stringify(data.weaknesses || []),
      JSON.stringify(data.improvementSuggestions || []),
      JSON.stringify(data.recommendedLearningPath || [])
    ];

    const [result] = await pool.execute(sql, params);
    return this.findById(result.insertId);
  }

  static async saveSession(sessObj) {
    const sql = `
      UPDATE interview_sessions SET
        ended_at = ?,
        duration = ?,
        status = ?,
        conversation_history = ?,
        overall_score = ?,
        total_questions = ?,
        total_questions_asked = ?,
        meaningful_answers_count = ?,
        category_scores = ?,
        strengths = ?,
        weaknesses = ?,
        improvement_suggestions = ?,
        recommended_learning_path = ?
      WHERE id = ?
    `;

    const params = [
      sessObj.endedAt ? new Date(sessObj.endedAt) : null,
      sessObj.durationMinutes || 0,
      sessObj.status || 'IN_PROGRESS',
      typeof sessObj.conversationHistory === 'string' ? sessObj.conversationHistory : JSON.stringify(sessObj.conversationHistory || []),
      sessObj.overallScore || 0,
      sessObj.totalQuestions || 0,
      sessObj.totalQuestionsAsked || 0,
      sessObj.meaningfulAnswersCount || 0,
      typeof sessObj.categoryScores === 'string' ? sessObj.categoryScores : JSON.stringify(sessObj.categoryScores || {}),
      JSON.stringify(sessObj.strengths || []),
      JSON.stringify(sessObj.weaknesses || []),
      JSON.stringify(sessObj.improvementSuggestions || []),
      JSON.stringify(sessObj.recommendedLearningPath || []),
      sessObj.id || sessObj._id
    ];

    await pool.execute(sql, params);
    return this.findById(sessObj.id || sessObj._id);
  }

  static async getAverageScore() {
    const [rows] = await pool.execute(
      "SELECT AVG(overall_score) as avgScore FROM interview_sessions WHERE status = 'COMPLETED'"
    );
    return rows[0].avgScore ? Math.round(rows[0].avgScore) : 0;
  }
}

module.exports = InterviewSession;
