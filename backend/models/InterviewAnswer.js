const { pool } = require('../config/database');

function weightedOverall(s) {
  return Math.round(
    (s.technical || 0) * 0.30 +
    (s.relevance || 0) * 0.18 +
    (s.problemSolving || 0) * 0.15 +
    (s.communication || 0) * 0.12 +
    (s.structure || 0) * 0.10 +
    (s.confidence || 0) * 0.08 +
    (s.grammar || 0) * 0.04 +
    (s.fluency || 0) * 0.03
  );
}

function formatAnswer(row) {
  if (!row) return null;

  const questionObj = row.q_text ? {
    _id: row.question_id,
    id: row.question_id,
    question: row.q_text,
    category: row.q_category,
    order: row.q_order
  } : row.question_id;

  const scores = {
    communication: row.communication_score || 0,
    technical: row.technical_score || 0,
    confidence: row.confidence_score || 0,
    fluency: row.fluency_score || 0,
    relevance: row.relevance_score || 0,
    grammar: row.grammar_score || 0,
    problemSolving: row.problem_solving_score || 0,
    structure: row.structure_score || 0
  };
  scores.overall = row.overall_score || weightedOverall(scores);

  return {
    _id: row.id,
    id: row.id,
    sessionId: row.session_id,
    questionId: questionObj,
    transcript: row.transcript,
    scores,
    feedback: row.feedback || '',
    followUpQuestion: row.follow_up_question || '',
    suggestedApproach: row.suggested_approach || '',
    answerSeconds: row.answer_seconds || 0,
    rerecordCount: row.rerecord_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const SCORE_PARAMS = (scores) => [
  scores.communication || 0,
  scores.technical || 0,
  scores.confidence || 0,
  scores.fluency || 0,
  scores.relevance || 0,
  scores.grammar || 0,
  scores.problemSolving || 0,
  scores.structure || 0,
  scores.overall !== undefined ? scores.overall : weightedOverall(scores)
];

class InterviewAnswer {
  static async findByQuestion(sessionId, questionId) {
    if (!sessionId || !questionId) return null;
    const [rows] = await pool.execute(
      'SELECT * FROM interview_answers WHERE session_id = ? AND question_id = ? LIMIT 1',
      [sessionId, questionId]
    );
    return rows.length ? formatAnswer(rows[0]) : null;
  }

  static async create(data) {
    const sessionId = data.sessionId || data.session_id;
    const questionId = data.questionId || data.question_id;
    const scores = data.scores || {};

    const sql = `
      INSERT INTO interview_answers (
        session_id, question_id, transcript, audio_url,
        communication_score, technical_score, confidence_score, fluency_score,
        relevance_score, grammar_score, problem_solving_score, structure_score,
        overall_score, feedback, follow_up_question, suggested_approach,
        answer_seconds, rerecord_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      sessionId,
      questionId,
      data.transcript,
      data.audioUrl || null,
      ...SCORE_PARAMS(scores),
      data.feedback || '',
      data.followUpQuestion || '',
      data.suggestedApproach || '',
      data.answerSeconds || 0,
      data.rerecordCount || 0
    ];

    const [result] = await pool.execute(sql, params);
    const [rows] = await pool.execute('SELECT * FROM interview_answers WHERE id = ?', [result.insertId]);
    return formatAnswer(rows[0]);
  }

  static async updateById(id, data) {
    const scores = data.scores || {};
    const sql = `
      UPDATE interview_answers SET
        transcript = ?,
        communication_score = ?, technical_score = ?, confidence_score = ?, fluency_score = ?,
        relevance_score = ?, grammar_score = ?, problem_solving_score = ?, structure_score = ?,
        overall_score = ?, feedback = ?, follow_up_question = ?, suggested_approach = ?,
        answer_seconds = ?, rerecord_count = ?
      WHERE id = ?
    `;

    const params = [
      data.transcript,
      ...SCORE_PARAMS(scores),
      data.feedback || '',
      data.followUpQuestion || '',
      data.suggestedApproach || '',
      data.answerSeconds || 0,
      data.rerecordCount || 0,
      id
    ];

    await pool.execute(sql, params);
    const [rows] = await pool.execute('SELECT * FROM interview_answers WHERE id = ?', [id]);
    return formatAnswer(rows[0]);
  }

  static async find(query = {}) {
    const sessionId = query.sessionId || query.session_id;
    let sql = `
      SELECT a.*, q.question AS q_text, q.category AS q_category, q.order_num AS q_order
      FROM interview_answers a
      LEFT JOIN interview_questions q ON a.question_id = q.id
    `;
    const params = [];

    if (sessionId) {
      sql += ' WHERE a.session_id = ?';
      params.push(sessionId);
    }

    sql += ' ORDER BY (CASE WHEN q.order_num > 100 THEN (q.order_num - 100) + 0.5 ELSE q.order_num END) ASC, a.created_at ASC';

    const [rows] = await pool.execute(sql, params);
    return rows.map(formatAnswer);
  }
}

module.exports = InterviewAnswer;
module.exports.weightedOverall = weightedOverall;
