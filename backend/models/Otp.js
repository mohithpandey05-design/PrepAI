const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

function formatOtp(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    email: row.email,
    otp: row.otp_code,
    expiresAt: row.expires_at,
    verified: Boolean(row.is_used),
    lastSentAt: row.last_sent_at,
    createdAt: row.created_at,

    matchOtp: async function (enteredOtp) {
      return await bcrypt.compare(enteredOtp, this.otp);
    },

    save: async function () {
      await pool.execute(
        'UPDATE otp SET is_used = ?, last_sent_at = ? WHERE id = ?',
        [this.verified ? 1 : 0, this.lastSentAt || new Date(), this.id]
      );
      return this;
    }
  };
}

class Otp {
  static async create(otpData) {
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otpData.otp, salt);
    const expiresAt = otpData.expiresAt || new Date(Date.now() + 10 * 60 * 1000);
    const lastSentAt = otpData.lastSentAt || new Date();

    const sql = `
      INSERT INTO otp (email, otp_code, expires_at, is_used, last_sent_at)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      otpData.email.toLowerCase(),
      hashedOtp,
      expiresAt,
      otpData.verified ? 1 : 0,
      lastSentAt
    ];

    const [result] = await pool.execute(sql, params);
    const [rows] = await pool.execute('SELECT * FROM otp WHERE id = ?', [result.insertId]);
    return formatOtp(rows[0]);
  }

  static async findOne(query) {
    let sql = 'SELECT * FROM otp WHERE email = ?';
    const params = [query.email.toLowerCase()];

    if (query.verified !== undefined) {
      sql += ' AND is_used = ?';
      params.push(query.verified ? 1 : 0);
    }

    if (query.expiresAt && query.expiresAt.$gt) {
      sql += ' AND expires_at > ?';
      params.push(query.expiresAt.$gt);
    }

    sql += ' ORDER BY created_at DESC LIMIT 1';

    const [rows] = await pool.execute(sql, params);
    if (rows.length === 0) return null;
    return formatOtp(rows[0]);
  }

  static async deleteMany(query) {
    if (query.email) {
      await pool.execute('DELETE FROM otp WHERE email = ?', [query.email.toLowerCase()]);
    }
  }
}

module.exports = Otp;
