const { pool } = require('../config/database');

function parseJson(val) {
  if (!val) return [];
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (e) { return []; }
  }
  return val;
}

function formatQuestion(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    question: row.question,
    options: parseJson(row.options),
    correctAnswer: row.correct_answer,
    category: row.category,
    difficulty: row.difficulty,
    marks: row.marks || 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

class AptitudeQuestion {
  static async findById(id) {
    if (!id) return null;
    const [rows] = await pool.execute('SELECT * FROM aptitude_questions WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return formatQuestion(rows[0]);
  }

  static async deleteMany() {
    await pool.execute('DELETE FROM aptitude_questions');
  }

  static async insertMany(docs) {
    if (!docs || docs.length === 0) return;
    for (const doc of docs) {
      const sql = `
        INSERT INTO aptitude_questions (question, options, correct_answer, category, difficulty, marks)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const params = [
        doc.question,
        JSON.stringify(doc.options),
        doc.correctAnswer,
        doc.category,
        doc.difficulty,
        doc.marks || 1
      ];
      await pool.execute(sql, params);
    }
  }

  static async getRandomQuestions({ category, difficulty, excludeIds = [], limit = 1 }) {
    let sql = 'SELECT * FROM aptitude_questions WHERE category = ?';
    const params = [category];

    if (difficulty) {
      sql += ' AND difficulty = ?';
      params.push(difficulty);
    }

    const cleanExclusions = (excludeIds || [])
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id) && id > 0);

    if (cleanExclusions.length > 0) {
      const placeholders = cleanExclusions.map(() => '?').join(',');
      sql += ` AND id NOT IN (${placeholders})`;
      params.push(...cleanExclusions);
    }

    sql += ` ORDER BY RAND() LIMIT ${parseInt(limit, 10)}`;

    const [rows] = await pool.execute(sql, params);
    return rows.map(formatQuestion);
  }
}

module.exports = AptitudeQuestion;
