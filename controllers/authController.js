//WEB 816324280818-o3fn87f706pmjarjdb03r42ap6agvn3i.apps.googleusercontent.com


const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const TempUser = require("../models/TempUser");

exports.registerInitiate = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields required" });

  const existingUser = await User.findOne({ email });
  if (existingUser)
    return res.status(400).json({ message: "User already exists" });

  const rawOTP = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOTP = await bcrypt.hash(rawOTP, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await TempUser.findOneAndUpdate(
    { email },
    {
      name,
      email,
      password,
      otp: hashedOTP,
      otpExpiresAt: expiresAt,
      otpAttempts: 0,
    },
    { upsert: true, new: true }
  );

  await sendEmail(email, "Your OTP Code", `<p>Your OTP is <b>${rawOTP}</b></p>`);

  res.json({ message: "OTP sent to email" });
};

exports.registerVerify = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP required" });

  const tempUser = await TempUser.findOne({ email });
  if (!tempUser)
    return res.status(400).json({ message: "No OTP found for this email" });

  if (tempUser.otpAttempts >= 5)
    return res.status(429).json({ message: "Too many failed attempts" });

  if (tempUser.otpExpiresAt < Date.now())
    return res.status(400).json({ message: "OTP expired" });

  const isMatch = await bcrypt.compare(otp, tempUser.otp);
  if (!isMatch) {
    tempUser.otpAttempts += 1;
    await tempUser.save();
    return res.status(400).json({ message: "Invalid OTP" });
  }

  // Hash final password and save user
  const hashedPassword = await bcrypt.hash(tempUser.password, 10);
  const newUser = new User({
    name: tempUser.name,
    email,
    password: hashedPassword,
  });
  await newUser.save();
  await TempUser.deleteOne({ email });

  res.status(201).json({ message: "User registered successfully" });
};



// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Please provide email and password" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid Credentials" });

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid Credentials" });

    // Create payload and sign token
    const payload = {   userId: user._id, 
                        name: user.name, 
                        email: user.email, 
                        photo: user.photo 
                    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: "Please provide an email" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User does not exist" });

    // Generate a reset token valid for 15 minutes
    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
    const resetLink = `${process.env.CLIENT_URL}/reset-password.html?token=${resetToken}`;
    console.log("CLIENT_URL:", process.env.CLIENT_URL);
    console.log("RESET_URL:", resetLink);

    const emailHTML = `
      <html>
        <body style="font-family: Arial, sans-serif; background-color: #f2f2f2; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 20px;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hello,</p>
            <p>You recently requested to reset your password. Click the button below to reset it. This link will expire in 15 minutes.</p>
            <p style="text-align: center;">
              <a href="${resetLink}" style="background-color: #007bff; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a>
            </p>
            <p>If you did not request a password reset, please ignore this email.</p>
            <p>Thank you,<br>Your Team</p>
          </div>
        </body>
      </html>
    `;

    await sendEmail(user.email, "Reset Your Password", emailHTML);

    res.json({
      message: "Reset link sent to your email",
      resetLink,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({
        message: "Please provide both a reset token and a new password",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (error) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(400).json({ message: "User does not exist" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
