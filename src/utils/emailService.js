const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const viewsDir = path.join(__dirname, '../views');

// signup welcome + verification email
const sendSignupNotification = async (email, firstName, verifyToken, appUrl = process.env.APP_URL || 'http://localhost:4000') => {
  const resetUrl = `${appUrl}/api/borrowers/verify-account?token=${verifyToken}&email=${email}`;
  
  const html = await ejs.renderFile(path.join(viewsDir, 'signup_notification.ejs'), { 
    firstName, 
    verifyToken, 
    verifyUrl: resetUrl,
    appUrl 
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Welcome! Verify Your Alternative Credit Account',
    html,
    text: `Welcome ${firstName}! Verify your account: ${resetUrl}`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Signup notification sent to ${email}`);
};

// login OTP notification
const sendLoginNotification = async (email, otp) => {
  const html = await ejs.renderFile(path.join(viewsDir, 'login_notification.ejs'), { otp });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Login Verification Code',
    html,
    text: `Your 4-digit verification code is: ${otp}. Expires in 10 minutes.`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Login OTP sent to ${email}`);
};

// forget password OTP request confirmation
const sendForgetPassword = async (email, otp) => {
  const html = await ejs.renderFile(path.join(viewsDir, 'forget_password.ejs'), { otp });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request - Your OTP Code',
    html,
    text: `Password reset OTP: ${otp}`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Forget password OTP sent to ${email}`);
};

// password reset confirmation
const sendResetPassword = async (email, firstName) => {
  const html = await ejs.renderFile(path.join(viewsDir, 'reset_password.ejs'), { firstName });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Successful',
    html,
    text: `Hi ${firstName}, your password has been successfully reset.`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Reset password confirmation sent to ${email}`);
};

// verification (for signup)
const sendVerifyAccount = async (email, firstName) => {
  const html = await ejs.renderFile(path.join(viewsDir, 'verify_account.ejs'), { firstName });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Account Verified Successfully!',
    html,
    text: `Hi ${firstName}, your account is now verified.`,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Account verification sent to ${email}`);
};

module.exports = {
  sendSignupNotification,
  sendLoginNotification,
  sendForgetPassword,
  sendResetPassword,
  sendVerifyAccount,
};

