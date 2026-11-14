/**
 * HTML Email Templates for Transactional Emails sent via Brevo
 */

function getVerificationEmailTemplate({ name, verificationUrl }) {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Email Anda</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7f9;
      margin: 0;
      padding: 0;
      color: #333333;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 35px 30px;
      line-height: 1.6;
    }
    .content p {
      margin: 0 0 16px;
      font-size: 15px;
    }
    .btn-container {
      text-align: center;
      margin: 30px 0;
    }
    .btn {
      display: inline-block;
      background: #4F46E5;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      transition: background 0.3s;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 30px;
      text-align: center;
      font-size: 13px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .link-fallback {
      font-size: 12px;
      color: #64748b;
      word-break: break-all;
      background: #f1f5f9;
      padding: 12px;
      border-radius: 6px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Selamat Datang di Chatbot!</h1>
    </div>
    <div class="content">
      <p>Halo <strong>${name || 'Pengguna'}</strong>,</p>
      <p>Terima kasih telah mendaftar. Untuk mengaktifkan akun Anda dan memastikan alamat email Anda valid, silakan klik tombol verifikasi di bawah ini:</p>
      <div class="btn-container">
        <a href="${verificationUrl}" class="btn">Verifikasi Email Saya</a>
      </div>
      <p>Link ini akan kedaluwarsa dalam <strong>24 jam</strong>. Jika Anda tidak merasa melakukan pendaftaran, silakan abaikan email ini.</p>
      <div class="link-fallback">
        Jika tombol di atas tidak berfungsi, salin dan tempel link berikut ke browser Anda:<br>
        <a href="${verificationUrl}">${verificationUrl}</a>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Chatbot Assistant. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getResetPasswordEmailTemplate({ name, resetUrl }) {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password Akun Anda</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7f9;
      margin: 0;
      padding: 0;
      color: #333333;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #EF4444 0%, #F97316 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 35px 30px;
      line-height: 1.6;
    }
    .content p {
      margin: 0 0 16px;
      font-size: 15px;
    }
    .btn-container {
      text-align: center;
      margin: 30px 0;
    }
    .btn {
      display: inline-block;
      background: #EF4444;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 30px;
      text-align: center;
      font-size: 13px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .link-fallback {
      font-size: 12px;
      color: #64748b;
      word-break: break-all;
      background: #f1f5f9;
      padding: 12px;
      border-radius: 6px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Permintaan Reset Password</h1>
    </div>
    <div class="content">
      <p>Halo <strong>${name || 'Pengguna'}</strong>,</p>
      <p>Kami menerima permintaan untuk mereset password akun Anda. Klik tombol di bawah ini untuk membuat password baru:</p>
      <div class="btn-container">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>
      <p>Link ini hanya berlaku selama <strong>30 menit</strong> demi keamanan akun Anda.</p>
      <p>Jika Anda tidak pernah meminta reset password, abaikan email ini dan password Anda akan tetap aman.</p>
      <div class="link-fallback">
        Jika tombol di atas tidak berfungsi, salin dan tempel link berikut ke browser Anda:<br>
        <a href="${resetUrl}">${resetUrl}</a>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Chatbot Assistant. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();
}

module.exports = {
  getVerificationEmailTemplate,
  getResetPasswordEmailTemplate
};
