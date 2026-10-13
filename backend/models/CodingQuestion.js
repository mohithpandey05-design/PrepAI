const { pool } = require('../config/database');

function parseJson(val, defaultVal = []) {
  if (!val) return defaultVal;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (e) { return defaultVal; }
  }
  return val;
}

function formatCodingQuestion(row) {
  if (!row) return null;

  const tags = parseJson(row.tags, []);
  const parsedTopics = parseJson(row.topics, null);
  const topics = (parsedTopics && Array.isArray(parsedTopics) && parsedTopics.length > 0)
    ? parsedTopics
    : (tags.length > 0 ? tags.map(t => t.toUpperCase()) : ['DSA']);

  return {
    _id: row.id,
    id: row.id,
    title: row.title,
    description: row.description,
    difficulty: row.difficulty,
    category: row.category || 'DSA',
    role: row.role || 'Software Engineer',
    tags,
    topics,
    inputFormat: row.input_format,
    outputFormat: row.output_format,
    constraints: row.constraints,
    followUp: row.follow_up || null,
    acceptanceRate: row.acceptance_rate || '78.5%',
    submissionsCount: row.submissions_count || 1240,
    hints: parseJson(row.hints, []),
    similarQuestions: parseJson(row.similar_questions, []),
    sampleInput: row.sample_input,
    sampleOutput: row.sample_output,
    starterCode: parseJson(row.starter_code, {
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}',
      java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}',
      python: '# Write your code here\n',
      javascript: '// Write your code here\n'
    }),
    testCases: parseJson(row.test_cases, []),
    hiddenTestCases: parseJson(row.hidden_test_cases, []),
    language: row.language || 'cpp,java,python,javascript',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

class CodingQuestion {
  static async findById(id) {
    if (!id) return null;
    const [rows] = await pool.execute('SELECT * FROM coding_questions WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return formatCodingQuestion(rows[0]);
  }

  static async deleteMany() {
    await pool.execute('DELETE FROM coding_questions');
  }

  static async insertMany(docs) {
    if (!docs || docs.length === 0) return;
    for (const doc of docs) {
      const sql = `
        INSERT INTO coding_questions (
          title, description, difficulty, category, role, tags, topics, input_format,
          output_format, constraints, follow_up, acceptance_rate, submissions_count,
          hints, similar_questions, sample_input, sample_output, starter_code,
          test_cases, hidden_test_cases, language
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        doc.title,
        doc.description,
        doc.difficulty,
        doc.category || 'DSA',
        doc.role || 'Software Engineer',
        JSON.stringify(doc.tags || []),
        JSON.stringify(doc.topics || doc.tags || []),
        doc.inputFormat,
        doc.outputFormat,
        doc.constraints,
        doc.followUp || null,
        doc.acceptanceRate || '78.5%',
        doc.submissionsCount || 1240,
        JSON.stringify(doc.hints || []),
        JSON.stringify(doc.similarQuestions || []),
        doc.sampleInput,
        doc.sampleOutput,
        JSON.stringify(doc.starterCode || {}),
        JSON.stringify(doc.testCases || []),
        JSON.stringify(doc.hiddenTestCases || []),
        doc.language || 'cpp,java,python,javascript'
      ];
      await pool.execute(sql, params);
    }
  }

  static async getRandomQuestionByTag(difficulty, tag) {
    let rows = [];
    try {
      let sql = 'SELECT * FROM coding_questions WHERE difficulty = ? AND JSON_CONTAINS(tags, ?) ORDER BY RAND() LIMIT 1';
      [rows] = await pool.execute(sql, [difficulty, JSON.stringify(tag || 'dsa')]);
    } catch (err) {
      rows = [];
    }

    if (!rows || rows.length === 0) {
      const sql = 'SELECT * FROM coding_questions WHERE difficulty = ? ORDER BY RAND() LIMIT 1';
      [rows] = await pool.execute(sql, [difficulty]);
    }

    if (!rows || rows.length === 0) {
      const sql = 'SELECT * FROM coding_questions ORDER BY RAND() LIMIT 1';
      [rows] = await pool.execute(sql);
    }

    if (!rows || rows.length === 0) return null;
    return formatCodingQuestion(rows[0]);
  }

  static async getProgressionQuestions(tag = 'dsa') {
    const fetchOne = async (difficulty, excludeIds = []) => {
      let cleanExclusions = excludeIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      let sql = 'SELECT * FROM coding_questions WHERE difficulty = ?';
      const params = [difficulty];

      if (cleanExclusions.length > 0) {
        const placeholders = cleanExclusions.map(() => '?').join(',');
        sql += ` AND id NOT IN (${placeholders})`;
        params.push(...cleanExclusions);
      }

      sql += ' ORDER BY RAND() LIMIT 1';
      let [rows] = await pool.execute(sql, params);

      if ((!rows || rows.length === 0) && cleanExclusions.length > 0) {
        const fbSql = 'SELECT * FROM coding_questions WHERE difficulty = ? ORDER BY RAND() LIMIT 1';
        [rows] = await pool.execute(fbSql, [difficulty]);
      }

      if (!rows || rows.length === 0) {
        const anySql = 'SELECT * FROM coding_questions ORDER BY RAND() LIMIT 1';
        [rows] = await pool.execute(anySql);
      }

      return rows && rows.length > 0 ? formatCodingQuestion(rows[0]) : null;
    };

    const selected = [];
    const usedIds = new Set();

    const diffSequence = ['Easy', 'Easy', 'Medium', 'Medium', 'Hard'];
    for (const diff of diffSequence) {
      const q = await fetchOne(diff, Array.from(usedIds));
      if (q && !usedIds.has(q.id)) {
        selected.push(q);
        usedIds.add(q.id);
      }
    }

    return selected;
  }
}

module.exports = CodingQuestion;
