// Run: node seedAdmin.js
// Creates (or resets) an admin account so you can log into the admin panel.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');

const ADMIN_EMAIL = 'admin@indrive-clone.local';
const ADMIN_PASSWORD = 'Admin123!';

(async () => {
  await connectDB();
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);

  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (admin) {
    admin.password = hashed;
    admin.role = 'admin';
    await admin.save();
    console.log('Existing admin password reset.');
  } else {
    admin = await User.create({
      name: 'Admin',
      email: ADMIN_EMAIL,
      phone: '0000000000',
      password: hashed,
      role: 'admin',
    });
    console.log('Admin user created.');
  }

  console.log('Login with:');
  console.log('  email:   ', ADMIN_EMAIL);
  console.log('  password:', ADMIN_PASSWORD);

  await mongoose.disconnect();
  process.exit(0);
})();
