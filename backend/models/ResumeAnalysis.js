const { pool } = require('../config/database');

function parseJson(val) {
  if (!val) return [];
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (e) { return []; }
  }
  return val;
}

function formatResumeAnalysis(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    resumeScore: row.resume_score || 0,
    atsScore: row.ats_score || row.resume_score || 0,
    summary: row.summary || '',
    detectedSkills: parseJson(row.detected_skills),
    missingSkills: parseJson(row.missing_skills),
    strengths: parseJson(row.strengths),
    weaknesses: parseJson(row.weaknesses),
    experience: parseJson(row.experience),
    education: parseJson(row.education),
    projects: parseJson(row.projects),
    detectedRole: row.detected_role || 'Software Engineer',
    recommendedRoles: parseJson(row.recommended_roles),
    analysisDate: row.analysis_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    save: async function () {
      return await ResumeAnalysis.saveAnalysis(this);
    }
  };
}

class ResumeAnalysis {
  static async findOne(query) {
    const userId = query.userId || query.user_id;
    if (!userId) return null;

    const [rows] = await pool.execute('SELECT * FROM resume_analyses WHERE user_id = ? LIMIT 1', [userId]);
    if (rows.length === 0) return null;
    return formatResumeAnalysis(rows[0]);
  }

  static async create(data) {
    const sql = `
      INSERT INTO resume_analyses (
        user_id, resume_score, ats_score, summary, detected_skills, missing_skills,
        strengths, weaknesses, experience, education, projects, detected_role,
        recommended_roles, analysis_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.userId || data.user_id,
      data.resumeScore || 0,
      data.atsScore || data.resumeScore || 0,
      data.summary || '',
      JSON.stringify(data.detectedSkills || []),
      JSON.stringify(data.missingSkills || []),
      JSON.stringify(data.strengths || []),
      JSON.stringify(data.weaknesses || []),
      JSON.stringify(data.experience || []),
      JSON.stringify(data.education || []),
      JSON.stringify(data.projects || []),
      data.detectedRole || 'Software Engineer',
      JSON.stringify(data.recommendedRoles || []),
      data.analysisDate || new Date()
    ];

    await pool.execute(sql, params);
    return this.findOne({ userId: data.userId || data.user_id });
  }

  static async saveAnalysis(analysis) {
    const sql = `
      UPDATE resume_analyses SET
        resume_score = ?,
        ats_score = ?,
        summary = ?,
        detected_skills = ?,
        missing_skills = ?,
        strengths = ?,
        weaknesses = ?,
        experience = ?,
        education = ?,
        projects = ?,
        detected_role = ?,
        recommended_roles = ?,
        analysis_date = ?
      WHERE id = ?
    `;

    const params = [
      analysis.resumeScore || 0,
      analysis.atsScore || analysis.resumeScore || 0,
      analysis.summary || '',
      JSON.stringify(analysis.detectedSkills || []),
      JSON.stringify(analysis.missingSkills || []),
      JSON.stringify(analysis.strengths || []),
      JSON.stringify(analysis.weaknesses || []),
      JSON.stringify(analysis.experience || []),
      JSON.stringify(analysis.education || []),
      JSON.stringify(analysis.projects || []),
      analysis.detectedRole || 'Software Engineer',
      JSON.stringify(analysis.recommendedRoles || []),
      analysis.analysisDate || new Date(),
      analysis.id || analysis._id
    ];

    await pool.execute(sql, params);
    return this.findOne({ userId: analysis.userId });
  }

  static async findOneAndDelete(query) {
    const userId = query.userId || query.user_id;
    if (!userId) return;
    await pool.execute('DELETE FROM resume_analyses WHERE user_id = ?', [userId]);
  }
}

module.exports = ResumeAnalysis;
