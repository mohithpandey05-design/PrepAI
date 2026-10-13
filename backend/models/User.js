const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

function parseJson(val) {
  if (!val) return [];
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (e) { return []; }
  }
  return val;
}

function formatUser(row, selectPassword = false) {
  if (!row) return null;
  const user = {
    _id: row.id,
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    password: row.password,
    phone: row.phone || '',
    college: row.college || '',
    branch: row.branch || '',
    graduationYear: row.graduation_year || null,
    skills: parseJson(row.skills),
    profileImage: row.profile_image || '',
    linkedin: row.linkedin || '',
    github: row.github || '',
    detectedRole: row.detected_role || 'Software Engineer',
    selectedRole: row.selected_role || row.detected_role || 'Software Engineer',
    isResumeDerivedName: Boolean(row.is_resume_derived_name),
    manualProfileData: parseJson(row.manual_profile_data),
    manuallyEditedFields: parseJson(row.manually_edited_fields),
    dataSource: row.data_source || 'resume',
    resumeUrl: row.resume_url || '',
    resumeFileName: row.resume_file_name || '',
    resumeUploadedAt: row.resume_uploaded_at || null,
    role: row.role || 'candidate',
    isVerified: Boolean(row.is_verified),
    resumeUploaded: Boolean(row.resume_uploaded),
    aptitudeCompleted: Boolean(row.aptitude_completed),
    codingCompleted: Boolean(row.coding_completed),
    interviewCompleted: Boolean(row.interview_completed),
    resetPasswordToken: row.reset_password_token || null,
    resetPasswordExpires: row.reset_password_expires || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    matchPassword: async function (enteredPassword) {
      return await bcrypt.compare(enteredPassword, this.password);
    },

    save: async function () {
      return await User.saveUser(this);
    }
  };

  if (!selectPassword) {
    delete user.password;
  }

  return user;
}

function formatDateTime(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'string' && !isNaN(val)) return new Date(parseInt(val, 10));
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

class User {
  static formatUser(row, selectPassword = false) {
    return formatUser(row, selectPassword);
  }
  static async findOne(query, options = {}) {
    const clauses = [];
    const params = [];

    if (query.email !== undefined) {
      clauses.push('email = ?');
      params.push(query.email.toLowerCase());
    }
    if (query._id !== undefined || query.id !== undefined) {
      clauses.push('id = ?');
      params.push(query._id || query.id);
    }
    if (query.resetPasswordToken !== undefined) {
      clauses.push('reset_password_token = ?');
      params.push(query.resetPasswordToken);
    }

    if (clauses.length === 0) return null;

    const sql = `SELECT * FROM users WHERE ${clauses.join(' AND ')} LIMIT 1`;
    const [rows] = await pool.execute(sql, params);

    if (rows.length === 0) return null;

    if (query.resetPasswordExpires && query.resetPasswordExpires.$gt) {
      const dbDate = new Date(rows[0].reset_password_expires);
      if (!dbDate || dbDate <= query.resetPasswordExpires.$gt) {
        return null;
      }
    }

    return formatUser(rows[0], options.selectPassword);
  }

  static async findById(id) {
    return this.findOne({ id });
  }

  static async create(userData) {
    let hashedPassword = userData.password;
    if (hashedPassword) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(hashedPassword, salt);
    }

    const skillsJson = JSON.stringify(userData.skills || []);
    const manualProfileJson = JSON.stringify(userData.manualProfileData || {});
    const manuallyEditedFieldsJson = JSON.stringify(userData.manuallyEditedFields || []);

    const sql = `
      INSERT INTO users (
        full_name, email, password, phone, college, branch, graduation_year,
        skills, profile_image, linkedin, github, detected_role, selected_role,
        is_resume_derived_name, manual_profile_data, manually_edited_fields, data_source,
        resume_url, resume_file_name, resume_uploaded_at,
        role, is_verified, resume_uploaded, aptitude_completed, coding_completed,
        interview_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      userData.fullName,
      userData.email.toLowerCase(),
      hashedPassword,
      userData.phone || '',
      userData.college || '',
      userData.branch || '',
      userData.graduationYear || null,
      skillsJson,
      userData.profileImage || '',
      userData.linkedin || '',
      userData.github || '',
      userData.detectedRole || 'Software Engineer',
      userData.selectedRole || userData.detectedRole || 'Software Engineer',
      userData.isResumeDerivedName ? 1 : 0,
      manualProfileJson,
      manuallyEditedFieldsJson,
      userData.dataSource || 'resume',
      userData.resumeUrl || '',
      userData.resumeFileName || '',
      formatDateTime(userData.resumeUploadedAt),
      userData.role || 'candidate',
      userData.isVerified ? 1 : 0,
      userData.resumeUploaded ? 1 : 0,
      userData.aptitudeCompleted ? 1 : 0,
      userData.codingCompleted ? 1 : 0,
      userData.interviewCompleted ? 1 : 0,
    ];

    const [result] = await pool.execute(sql, params);
    return this.findById(result.insertId);
  }

  static async saveUser(user) {
    let hashedPassword = user.password;
    if (user._passwordModified && hashedPassword) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(hashedPassword, salt);
    }

    const skillsJson = JSON.stringify(user.skills || []);
    const manualProfileJson = JSON.stringify(user.manualProfileData || {});
    const manuallyEditedFieldsJson = JSON.stringify(user.manuallyEditedFields || []);

    const sql = `
      UPDATE users SET
        full_name = ?,
        email = ?,
        password = COALESCE(?, password),
        phone = ?,
        college = ?,
        branch = ?,
        graduation_year = ?,
        skills = ?,
        profile_image = ?,
        linkedin = ?,
        github = ?,
        detected_role = ?,
        selected_role = ?,
        is_resume_derived_name = ?,
        manual_profile_data = ?,
        manually_edited_fields = ?,
        data_source = ?,
        resume_url = ?,
        resume_file_name = ?,
        resume_uploaded_at = ?,
        role = ?,
        is_verified = ?,
        resume_uploaded = ?,
        aptitude_completed = ?,
        coding_completed = ?,
        interview_completed = ?,
        reset_password_token = ?,
        reset_password_expires = ?
      WHERE id = ?
    `;

    const params = [
      user.fullName,
      user.email.toLowerCase(),
      user._passwordModified ? hashedPassword : null,
      user.phone || '',
      user.college || '',
      user.branch || '',
      user.graduationYear || null,
      skillsJson,
      user.profileImage || '',
      user.linkedin || '',
      user.github || '',
      user.detectedRole || 'Software Engineer',
      user.selectedRole || user.detectedRole || 'Software Engineer',
      user.isResumeDerivedName ? 1 : 0,
      manualProfileJson,
      manuallyEditedFieldsJson,
      user.dataSource || 'resume',
      user.resumeUrl || '',
      user.resumeFileName || '',
      formatDateTime(user.resumeUploadedAt),
      user.role || 'candidate',
      user.isVerified ? 1 : 0,
      user.resumeUploaded ? 1 : 0,
      user.aptitudeCompleted ? 1 : 0,
      user.codingCompleted ? 1 : 0,
      user.interviewCompleted ? 1 : 0,
      user.resetPasswordToken || null,
      user.resetPasswordExpires || null,
      user.id || user._id,
    ];

    await pool.execute(sql, params);
    return this.findById(user.id || user._id);
  }

  static async deleteOne(query) {
    const id = query._id || query.id;
    if (!id) return;
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
  }

  static async countDocuments(query = {}) {
    let sql = 'SELECT COUNT(*) as count FROM users';
    const clauses = [];
    const params = [];

    if (query.isVerified !== undefined) {
      clauses.push('is_verified = ?');
      params.push(query.isVerified ? 1 : 0);
    }
    if (query.resumeUploaded !== undefined) {
      clauses.push('resume_uploaded = ?');
      params.push(query.resumeUploaded ? 1 : 0);
    }
    if (query.aptitudeCompleted !== undefined) {
      clauses.push('aptitude_completed = ?');
      params.push(query.aptitudeCompleted ? 1 : 0);
    }
    if (query.codingCompleted !== undefined) {
      clauses.push('coding_completed = ?');
      params.push(query.codingCompleted ? 1 : 0);
    }
    if (query.interviewCompleted !== undefined) {
      clauses.push('interview_completed = ?');
      params.push(query.interviewCompleted ? 1 : 0);
    }
    if (query.$or && Array.isArray(query.$or)) {
      const orClauses = [];
      for (const cond of query.$or) {
        if (cond.fullName && cond.fullName.$regex) {
          orClauses.push('full_name LIKE ?');
          params.push(`%${cond.fullName.$regex}%`);
        }
        if (cond.email && cond.email.$regex) {
          orClauses.push('email LIKE ?');
          params.push(`%${cond.email.$regex}%`);
        }
      }
      if (orClauses.length > 0) {
        clauses.push(`(${orClauses.join(' OR ')})`);
      }
    }

    if (clauses.length > 0) {
      sql += ' WHERE ' + clauses.join(' AND ');
    }

    const [rows] = await pool.execute(sql, params);
    return rows[0].count;
  }

  static async find(query = {}, options = {}) {
    let sql = 'SELECT * FROM users';
    const clauses = [];
    const params = [];

    if (query.$or && Array.isArray(query.$or)) {
      const orClauses = [];
      for (const cond of query.$or) {
        if (cond.fullName && cond.fullName.$regex) {
          orClauses.push('full_name LIKE ?');
          params.push(`%${cond.fullName.$regex}%`);
        }
        if (cond.email && cond.email.$regex) {
          orClauses.push('email LIKE ?');
          params.push(`%${cond.email.$regex}%`);
        }
      }
      if (orClauses.length > 0) {
        clauses.push(`(${orClauses.join(' OR ')})`);
      }
    }

    if (clauses.length > 0) {
      sql += ' WHERE ' + clauses.join(' AND ');
    }

    if (options.sort) {
      sql += ' ORDER BY created_at DESC';
    }

    if (options.skip !== undefined && options.limit !== undefined) {
      sql += ` LIMIT ${parseInt(options.limit, 10)} OFFSET ${parseInt(options.skip, 10)}`;
    }

    const [rows] = await pool.execute(sql, params);
    return rows.map(r => formatUser(r, false));
  }
}

module.exports = User;
