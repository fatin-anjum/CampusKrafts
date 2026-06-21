const nodemailer = require('nodemailer');
require('dotenv').config();

const sendOTPEmail = async (email, otpCode) => {
  const hasSMTP = process.env.SMTP_USER && process.env.SMTP_PASS;

  if (hasSMTP) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
        port: parseInt(process.env.SMTP_PORT || '2525'),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || '"CampusKrafts" <noreply@campuskrafts.com>',
        to: email,
        subject: 'CampusKrafts - Email Verification OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
            <h2 style="color: #6366f1; text-align: center;">CampusKrafts OTP Verification</h2>
            <p>Welcome to CampusKrafts, your ultimate prep portal for BRAC University Admissions!</p>
            <p>Please use the verification code below to verify your email address:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f46e5; border: 2px dashed #4f46e5; padding: 10px 25px; border-radius: 5px; background: #e0e7ff;">${otpCode}</span>
            </div>
            <p>This code is valid for 15 minutes. If you did not register on our website, please ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
            <p style="font-size: 12px; color: #777; text-align: center;">CampusKrafts Prep Team &bull; BRAC University Admissions Focus</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[SMTP] Verification email sent successfully to ${email}.`);
      return true;
    } catch (error) {
      console.error('[SMTP ERROR] Failed to send email via SMTP:', error.message);
    }
  }

  // Fallback to console logging (Developer/Testing experience)
  console.log('\n======================================================');
  console.log('   CAMPUSKRAFTS DEVELOPER OTP LOG');
  console.log(`   To: ${email}`);
  console.log(`   Verification Code: ${otpCode}`);
  console.log('   (To send real emails, fill in SMTP credentials in backend/.env)');
  console.log('======================================================\n');
  return true;
};

module.exports = { sendOTPEmail };
