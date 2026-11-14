const crypto = require("crypto");
const prisma = require("../../prisma/prismaClient");
const bcrypt = require("../helper/bcrypt");
const jwt = require("../helper/jwt");
const { ApiError } = require("../helper/error");
const { sendTransactionalEmail } = require("../helper/email");
const { getVerificationEmailTemplate, getResetPasswordEmailTemplate } = require("../helper/emailTemplates");

async function register(data) {
  try {
    const { email, password, name } = data || {};
    if (!email || !password || !name) {
      throw new ApiError(400, "Name, email, and password are required");
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) throw new ApiError(409, "User Already Exist");

    const hashedPassword = bcrypt.hashPassword(password);

    // Generate verification token and set 24-hour expiry
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        isVerified: false,
        verificationToken,
        verificationTokenExpiresAt
      },
      select: {
        id: true,
        email: true,
        name: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Send verification email asynchronously without blocking registration failure if SMTP fails
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    const emailHtml = getVerificationEmailTemplate({ name: user.name, verificationUrl });

    sendTransactionalEmail(user.email, "Verifikasi Email Akun Anda", emailHtml).catch((err) => {
      console.error("Failed to send verification email:", err.message);
    });

    return user;
  } catch (error) {
    console.log(error);
    throw new ApiError(error.statusCode || 400, error.message || "Something went wrong");
  }
}

async function verifyEmail(token) {
  try {
    if (!token) {
      throw new ApiError(400, "Verification token is required");
    }

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token
      }
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired verification token");
    }

    if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < new Date()) {
      throw new ApiError(400, "Verification token has expired");
    }

    if (user.isVerified) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        isVerified: true
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        isVerified: true
      }
    });

    return updatedUser;
  } catch (error) {
    console.log(error);
    throw new ApiError(error.statusCode || 400, error.message);
  }
}

async function forgotPassword(email) {
  try {
    if (!email) {
      throw new ApiError(400, "Email is required");
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Keamanan: Jika tidak ada, tetap kembalikan pesan sukses secara generik agar tidak membocorkan data user
    if (!user) {
      return { message: "If an account with that email exists, a password reset link has been sent." };
    }

    // Generate secure reset token with 30 minutes expiry
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordTokenExpiresAt
      }
    });

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    const emailHtml = getResetPasswordEmailTemplate({ name: user.name, resetUrl });

    sendTransactionalEmail(user.email, "Reset Password Akun Anda", emailHtml).catch((err) => {
      console.error("Failed to send reset password email:", err.message);
    });

    return { message: "If an account with that email exists, a password reset link has been sent." };
  } catch (error) {
    console.log(error);
    throw new ApiError(error.statusCode || 400, error.message);
  }
}

async function resetPassword(data) {
  try {
    const token = data.token;
    const newPassword = data.newPassword || data.new_password;

    if (!token || !newPassword) {
      throw new ApiError(400, "Token and new password are required");
    }

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token
      }
    });

    if (!user) {
      throw new ApiError(400, "Invalid or expired password reset token");
    }

    if (user.resetPasswordTokenExpiresAt && user.resetPasswordTokenExpiresAt < new Date()) {
      throw new ApiError(400, "Password reset token has expired");
    }

    const hashedPassword = bcrypt.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null
      }
    });

    return { message: "Password has been reset successfully" };
  } catch (error) {
    console.log(error);
    throw new ApiError(error.statusCode || 400, error.message);
  }
}

async function login(data) {
  try {
    const { email, password } = data || {};
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new ApiError(409, "Invalid email");

    if (user.isVerified === false) {
      throw new ApiError(403, "Please verify your email before logging in");
    }

    // Cek password
    const isPasswordValid = bcrypt.comparePassword(password, user.password);
    if (!isPasswordValid) throw new ApiError(400, "Invalid password");

    // Buat token JWT
    const token = jwt.generateToken({ id: user.id, email: user.email });

    return { token };
  } catch (error) {
    console.log(error);
    throw new ApiError(error.statusCode || 400, error.message);
  }
}

module.exports = {
  register,
  verifyEmail,
  forgotPassword,
  resetPassword,
  login
};