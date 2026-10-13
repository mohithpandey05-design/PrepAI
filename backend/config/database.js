const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ai_interview_platform',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
});

const initializeDatabase = async () => {

  const dbName = process.env.DB_NAME || 'ai_interview_platform';
  try {
    const adminConn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });
    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await adminConn.end();
  } catch (err) {
    console.warn(`[DB WARNING] Could not auto-create database '${dbName}':`, err.message);
  }

  const connection = await pool.getConnection();
  try {
    console.log(`Connecting to MySQL database '${dbName}'...`);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50) DEFAULT '',
        college VARCHAR(255) DEFAULT '',
        branch VARCHAR(255) DEFAULT '',
        graduation_year INT NULL,
        skills JSON NULL,
        profile_image TEXT NULL,
        linkedin VARCHAR(255) DEFAULT '',
        github VARCHAR(255) DEFAULT '',
        detected_role VARCHAR(100) DEFAULT 'Software Engineer',
        selected_role VARCHAR(100) DEFAULT NULL,
        is_resume_derived_name TINYINT(1) DEFAULT 0,
        manual_profile_data JSON NULL,
        manually_edited_fields JSON NULL,
        data_source VARCHAR(50) DEFAULT 'resume',
        resume_url TEXT NULL,
        resume_file_name VARCHAR(255) DEFAULT '',
        resume_uploaded_at DATETIME NULL,
        role ENUM('candidate', 'admin') DEFAULT 'candidate',
        is_verified TINYINT(1) DEFAULT 0,
        resume_uploaded TINYINT(1) DEFAULT 0,
        aptitude_completed TINYINT(1) DEFAULT 0,
        coding_completed TINYINT(1) DEFAULT 0,
        interview_completed TINYINT(1) DEFAULT 0,
        reset_password_token VARCHAR(255) NULL,
        reset_password_expires DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_email (email),
        INDEX idx_users_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const userUpgradeCols = [
      { col: 'selected_role', type: 'VARCHAR(100) DEFAULT NULL' },
      { col: 'is_resume_derived_name', type: 'TINYINT(1) DEFAULT 0' },
      { col: 'manual_profile_data', type: 'JSON NULL' },
      { col: 'manually_edited_fields', type: 'JSON NULL' },
      { col: 'data_source', type: "VARCHAR(50) DEFAULT 'resume'" }
    ];
    for (const c of userUpgradeCols) {
      try {
        const [existing] = await connection.query(`SHOW COLUMNS FROM users LIKE '${c.col}'`);
        if (existing.length === 0) {
          await connection.query(`ALTER TABLE users ADD COLUMN ${c.col} ${c.type}`);
        }
      } catch (e) {  }
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS otp (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        is_used TINYINT(1) DEFAULT 0,
        last_sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_otp_email (email),
        INDEX idx_otp_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS resume_analyses (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL UNIQUE,
        resume_score INT DEFAULT 0,
        ats_score INT DEFAULT 0,
        summary TEXT NULL,
        detected_skills JSON NULL,
        missing_skills JSON NULL,
        strengths JSON NULL,
        weaknesses JSON NULL,
        experience JSON NULL,
        education JSON NULL,
        projects JSON NULL,
        detected_role VARCHAR(100) DEFAULT 'Software Engineer',
        recommended_roles JSON NULL,
        analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS aptitude_questions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        options JSON NOT NULL,
        correct_answer VARCHAR(255) NOT NULL,
        category ENUM('Quantitative', 'Logical', 'Verbal') NOT NULL,
        difficulty ENUM('Easy', 'Medium', 'Hard') NOT NULL,
        marks INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_apt_cat_diff (category, difficulty)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS aptitude_results (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL UNIQUE,
        score INT DEFAULT 0,
        total_questions INT DEFAULT 15,
        correct_answers INT DEFAULT 0,
        wrong_answers INT DEFAULT 0,
        percentage INT DEFAULT 0,
        status ENUM('PASS', 'FAIL') DEFAULT 'FAIL',
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS aptitude_attempt_questions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        attempt_id BIGINT UNSIGNED NOT NULL,
        question_id BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (attempt_id) REFERENCES aptitude_results(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES aptitude_questions(id) ON DELETE CASCADE,
        INDEX idx_attempt_qs (attempt_id, question_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS coding_questions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        difficulty ENUM('Easy', 'Medium', 'Hard') NOT NULL,
        category VARCHAR(100) DEFAULT 'DSA',
        role VARCHAR(100) DEFAULT 'Software Engineer',
        tags JSON NULL,
        input_format TEXT NOT NULL,
        output_format TEXT NOT NULL,
        constraints TEXT NOT NULL,
        sample_input TEXT NOT NULL,
        sample_output TEXT NOT NULL,
        starter_code JSON NULL,
        test_cases JSON NOT NULL,
        hidden_test_cases JSON NOT NULL,
        language VARCHAR(100) DEFAULT 'cpp,java,python,javascript',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_coding_diff (difficulty)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const codingColumns = [
      { col: 'topics', type: 'JSON NULL' },
      { col: 'hints', type: 'JSON NULL' },
      { col: 'follow_up', type: 'TEXT NULL' },
      { col: 'acceptance_rate', type: 'VARCHAR(50) DEFAULT "78.5%"' },
      { col: 'submissions_count', type: 'INT DEFAULT 1240' },
      { col: 'similar_questions', type: 'JSON NULL' }
    ];

    for (const c of codingColumns) {
      try {
        const [existing] = await connection.query(`SHOW COLUMNS FROM coding_questions LIKE '${c.col}'`);
        if (existing.length === 0) {
          await connection.query(`ALTER TABLE coding_questions ADD COLUMN ${c.col} ${c.type}`);
        }
      } catch (err) {
        console.warn(`[DB MIGRATION] Column ${c.col}:`, err.message);
      }
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS coding_results (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        question_id BIGINT UNSIGNED NOT NULL,
        language VARCHAR(50) NULL,
        submitted_code MEDIUMTEXT NULL,
        passed_test_cases INT DEFAULT 0,
        total_test_cases INT DEFAULT 0,
        score INT DEFAULT 0,
        status ENUM('PASS', 'FAIL', 'Compilation Error') DEFAULT 'FAIL',
        execution_time VARCHAR(50) DEFAULT '',
        memory VARCHAR(50) DEFAULT '',
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_question (user_id, question_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES coding_questions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS interview_sessions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        session_id VARCHAR(100) NULL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME NULL,
        duration INT DEFAULT 0,
        status ENUM('IN_PROGRESS', 'COMPLETED', 'ABANDONED') DEFAULT 'IN_PROGRESS',
        conversation_history JSON NULL,
        overall_score INT DEFAULT 0,
        total_questions INT DEFAULT 0,
        total_questions_asked INT DEFAULT 0,
        meaningful_answers_count INT DEFAULT 0,
        category_scores JSON NULL,
        strengths JSON NULL,
        weaknesses JSON NULL,
        improvement_suggestions JSON NULL,
        recommended_learning_path JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS interview_questions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        session_id BIGINT UNSIGNED NOT NULL,
        question TEXT NOT NULL,
        category ENUM('Introduction', 'Technical', 'Behavioral', 'Project', 'Closing', 'Follow-up') NOT NULL,
        difficulty ENUM('Easy', 'Medium', 'Hard') DEFAULT 'Medium',
        is_answered TINYINT(1) DEFAULT 0,
        prep_seconds INT DEFAULT 30,
        answer_seconds INT DEFAULT 120,
        order_num INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
        INDEX idx_iq_session_order (session_id, order_num)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS interview_answers (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        session_id BIGINT UNSIGNED NOT NULL,
        question_id BIGINT UNSIGNED NOT NULL,
        transcript TEXT NOT NULL,
        audio_url TEXT NULL,
        communication_score INT DEFAULT 0,
        technical_score INT DEFAULT 0,
        confidence_score INT DEFAULT 0,
        fluency_score INT DEFAULT 0,
        relevance_score INT DEFAULT 0,
        grammar_score INT DEFAULT 0,
        problem_solving_score INT DEFAULT 0,
        structure_score INT DEFAULT 0,
        overall_score INT DEFAULT 0,
        feedback TEXT NULL,
        follow_up_question TEXT NULL,
        suggested_approach TEXT NULL,
        answer_seconds INT DEFAULT 0,
        rerecord_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_session_question (session_id, question_id),
        FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const interviewColumns = [
      { table: 'interview_sessions', col: 'total_questions', type: 'INT DEFAULT 0' },
      { table: 'interview_sessions', col: 'total_questions_asked', type: 'INT DEFAULT 0' },
      { table: 'interview_sessions', col: 'meaningful_answers_count', type: 'INT DEFAULT 0' },
      { table: 'interview_sessions', col: 'category_scores', type: 'JSON NULL' },
      { table: 'interview_questions', col: 'prep_seconds', type: 'INT DEFAULT 30' },
      { table: 'interview_questions', col: 'answer_seconds', type: 'INT DEFAULT 120' },
      { table: 'interview_answers', col: 'problem_solving_score', type: 'INT DEFAULT 0' },
      { table: 'interview_answers', col: 'structure_score', type: 'INT DEFAULT 0' },
      { table: 'interview_answers', col: 'overall_score', type: 'INT DEFAULT 0' },
      { table: 'interview_answers', col: 'suggested_approach', type: 'TEXT NULL' },
      { table: 'interview_answers', col: 'answer_seconds', type: 'INT DEFAULT 0' },
      { table: 'interview_answers', col: 'rerecord_count', type: 'INT DEFAULT 0' }
    ];

    for (const c of interviewColumns) {
      try {
        const [existing] = await connection.query(`SHOW COLUMNS FROM ${c.table} LIKE '${c.col}'`);
        if (existing.length === 0) {
          await connection.query(`ALTER TABLE ${c.table} ADD COLUMN ${c.col} ${c.type}`);
        }
      } catch (err) {
        console.warn(`[DB MIGRATION] ${c.table}.${c.col}:`, err.message);
      }
    }

    try {
      const [catCol] = await connection.query(`SHOW COLUMNS FROM interview_questions LIKE 'category'`);
      if (catCol.length > 0 && !String(catCol[0].Type).includes("'Closing'")) {
        await connection.query(`
          ALTER TABLE interview_questions
          MODIFY COLUMN category
          ENUM('Introduction', 'Technical', 'Behavioral', 'Project', 'Closing', 'Follow-up') NOT NULL
        `);
      }
    } catch (err) {
      console.warn('[DB MIGRATION] interview_questions.category ENUM:', err.message);
    }

    try {
      const [idx] = await connection.query(
        `SHOW INDEX FROM interview_answers WHERE Key_name = 'uniq_session_question'`
      );
      if (idx.length === 0) {
        await connection.query(
          `ALTER TABLE interview_answers ADD UNIQUE KEY uniq_session_question (session_id, question_id)`
        );
      }
    } catch (err) {
      console.warn('[DB MIGRATION] interview_answers unique (session_id, question_id):', err.message);
    }

    try {
      const { isValidCandidateName } = require('../utils/candidateNameValidator');
      const [allUsers] = await connection.query('SELECT id, full_name, email, manual_profile_data FROM users');
      for (const u of allUsers) {
        if (!isValidCandidateName(u.full_name)) {
          let repairedName = '';
          if (u.manual_profile_data) {
            try {
              const mp = typeof u.manual_profile_data === 'string' ? JSON.parse(u.manual_profile_data) : u.manual_profile_data;
              if (mp.fullName && isValidCandidateName(mp.fullName)) {
                repairedName = mp.fullName.trim();
              }
            } catch (e) {}
          }
          await connection.query('UPDATE users SET full_name = ?, is_resume_derived_name = 0 WHERE id = ?', [repairedName, u.id]);
          console.log(`[DB REPAIR] Repaired corrupted full_name for user ID ${u.id} (${u.email}): "${u.full_name}" -> "${repairedName}"`);
        }
      }
    } catch (repairErr) {
      console.warn('[DB REPAIR WARNING]', repairErr.message);
    }

    console.log('MySQL Database & Tables verified successfully.');
  } catch (error) {
    console.error('Failed to initialize MySQL Database:', error.message);
    throw error;
  } finally {
    connection.release();
  }
};

const query = async (sql, params) => {
  const [results] = await pool.execute(sql, params);
  return results;
};

module.exports = {
  pool,
  query,
  initializeDatabase,
};
