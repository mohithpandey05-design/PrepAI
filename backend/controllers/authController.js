const User = require('../models/User');
const Otp = require('../models/Otp');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');
const { sendOtpEmail, sendPasswordResetEmail } = require('../services/emailService');

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const register = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser && existingUser.isVerified) {
      res.status(400);
      throw new Error('An account with this email already exists');
    }

    if (existingUser && !existingUser.isVerified) {
      await User.deleteOne({ _id: existingUser._id });
    }

    const user = await User.create({
      fullName,
      email: email.toLowerCase(),
      password,
      isVerified: false,
    });

    const otpCode = generateOtp();
    console.log(`[OTP LOG] OTP Generated: ${otpCode} for ${email.toLowerCase()}`);

    await Otp.deleteMany({ email: email.toLowerCase() });

    await Otp.create({
      email: email.toLowerCase(),
      otp: otpCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    console.log(`[OTP LOG] OTP Saved to Database for ${email.toLowerCase()}`);

    let emailSent = false;
    try {
      await sendOtpEmail(email, otpCode, fullName);
      emailSent = true;
      console.log(`[OTP LOG] OTP Sent successfully via email to ${email.toLowerCase()}`);
    } catch (emailError) {
      console.error(`[OTP LOG] Failed to send OTP email to ${email}:`, emailError.message);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV MODE] Active fallback OTP for ${email}: ${otpCode}`);
      }
    }

    res.status(201).json({
      success: true,
      message: emailSent
        ? 'Account created. Please verify your email with the OTP sent to your inbox.'
        : 'Account created. Email delivery pending — check server log or use development OTP.',
      email: email.toLowerCase(),
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otpCode }),
    });
  } catch (error) {
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400);
      throw new Error('Email and OTP are required');
    }

    const otpRecord = await Otp.findOne({
      email: email.toLowerCase(),
      expiresAt: { $gt: new Date() },
      verified: false,
    });

    if (!otpRecord) {
      res.status(400);
      throw new Error('OTP has expired or is invalid. Please request a new one.');
    }

    const isMatch = await otpRecord.matchOtp(otp);
    if (!isMatch) {
      res.status(400);
      throw new Error('Invalid OTP code. Please check and try again.');
    }

    otpRecord.verified = true;
    await otpRecord.save();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404);
      throw new Error('User account not found');
    }

    user.isVerified = true;
    await user.save();

    await Otp.deleteMany({ email: email.toLowerCase() });

    console.log(`[OTP LOG] OTP Verified successfully for ${email.toLowerCase()}`);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! Access granted.',
      token: generateToken(user._id),
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      },
    });
  } catch (error) {
    next(error);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error('Email is required');
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404);
      throw new Error('No account found with this email address');
    }

    if (user.isVerified) {
      res.status(400);
      throw new Error('This email address is already verified.');
    }

    const existingOtp = await Otp.findOne({ email: email.toLowerCase() });
    if (existingOtp && existingOtp.lastSentAt) {
      const timePassed = (Date.now() - new Date(existingOtp.lastSentAt).getTime()) / 1000;
      if (timePassed < 60) {
        const remaining = Math.ceil(60 - timePassed);
        res.status(429);
        throw new Error(`Please wait ${remaining} seconds before requesting a new OTP.`);
      }
    }

    const otpCode = generateOtp();
    console.log(`[OTP LOG] OTP Generated (Resend): ${otpCode} for ${email.toLowerCase()}`);

    await Otp.deleteMany({ email: email.toLowerCase() });
    await Otp.create({
      email: email.toLowerCase(),
      otp: otpCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      lastSentAt: new Date(),
    });
    console.log(`[OTP LOG] OTP Saved to Database for ${email.toLowerCase()}`);

    let emailSent = false;
    try {
      await sendOtpEmail(email, otpCode, user.fullName);
      emailSent = true;
      console.log(`[OTP LOG] OTP Sent successfully via email to ${email.toLowerCase()}`);
    } catch (emailError) {
      console.error(`[OTP LOG] Failed to resend OTP email to ${email}:`, emailError.message);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV MODE] Resent OTP for ${email}: ${otpCode}`);
      }
    }

    res.status(200).json({
      success: true,
      message: emailSent ? 'A new OTP has been sent to your email.' : 'Failed to send email. Check configuration.',
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otpCode }),
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide an email and password');
    }

    const user = await User.findOne({ email: email.toLowerCase() }, { selectPassword: true });

    if (!user) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    if (!user.isVerified) {
      res.status(403);
      throw new Error('Please verify your email before logging in. Check your inbox for the OTP.');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    res.status(200).json({
      success: true,
      message: 'Login Successful',
      token: generateToken(user._id),
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error('Email is required');
    }

    console.log(`[PASSWORD RESET] Request received for ${email}`);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`[PASSWORD RESET] Account not found for ${email}, returning generic success response`);
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    console.log(`[PASSWORD RESET] Token generated for ${email}`);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    let emailSent = false;
    try {
      console.log(`[PASSWORD RESET] Email send started for ${email}`);
      await sendPasswordResetEmail(email, resetToken, user.fullName);
      emailSent = true;
      console.log(`[PASSWORD RESET] Email send successful for ${email}`);
    } catch (emailError) {
      console.error(`[PASSWORD RESET] Email send failed: ${emailError.message}`);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV MODE] Reset token for ${email}: ${resetToken}`);
      }
    }

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      ...(process.env.NODE_ENV !== 'production' && { devToken: resetToken }),
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      res.status(400);
      throw new Error('Email, token, and new password are required');
    }

    if (newPassword.length < 8) {
      res.status(400);
      throw new Error('Password must be at least 8 characters');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }, { selectPassword: true });

    if (!user) {
      res.status(400);
      throw new Error('Invalid or expired reset token. Please request a new one.');
    }

    user.password = newPassword;
    user._passwordModified = true;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
};
