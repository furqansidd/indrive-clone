const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Otp = require('../models/Otp');
const nodemailer = require('nodemailer');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });

// POST /api/auth/send-otp  { email }
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Check if email already registered
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    await Otp.findOneAndUpdate(
      { email },
      { code, expiresAt },
      { upsert: true, new: true }
    );

    // Create SMTP transporter using Gmail details from process.env
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"inDrive Clone" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'inDrive Clone — Registration Verification Code',
      text: `Your verification code is: ${code}\nThis code is valid for 5 minutes.`,
      html: `<h3>inDrive Clone</h3><p>Your verification code is: <b>${code}</b></p><p>This code is valid for 5 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Verification OTP sent to your email.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/register  { name, email, phone, password, role, otp }
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role, otp } = req.body;
    if (!name || !email || !phone || !password || !otp) {
      return res.status(400).json({ message: 'All fields including verification code are required' });
    }

    // Verify OTP
    const otpRecord = await Otp.findOne({ email });
    if (!otpRecord || otpRecord.code !== otp || otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) return res.status(409).json({ message: 'Email or phone already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      phone,
      password: hashed,
      role: role === 'driver' ? 'driver' : 'rider',
    });

    // Delete the verified OTP record so it cannot be reused
    await Otp.deleteOne({ email });

    if (user.role === 'driver') {
      const vehicle = req.body.vehicle || {};
      await Driver.create({
        user: user._id,
        vehicle: {
          type: vehicle.type || 'car',
          make: vehicle.make || '',
          model: vehicle.model || '',
          color: vehicle.color || '',
          plateNumber: vehicle.plateNumber || '',
        },
      });
    }

    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login  { email, password }
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user._id);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  res.json({ user: req.user });
};

// PATCH /api/auth/me  { name, email, phone }
exports.updateMe = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/change-password  { currentPassword, newPassword }
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new passwords are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    // Fetch the full user doc (including password hash)
    const user = await User.findById(req.user._id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect.' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
