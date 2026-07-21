const mongoose = require('mongoose');
const dns = require('dns');

// Force Google DNS to resolve MongoDB Atlas SRV records
// (bypasses router DNS that may not support SRV lookups)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/indrive_clone';
  const tryConnect = async () => {
    try {
      await mongoose.connect(uri);
      console.log('MongoDB connected successfully');
    } catch (err) {
      console.error('MongoDB connection error:', err.message);
      console.log('Retrying MongoDB connection in 10 seconds...');
      setTimeout(tryConnect, 10000);
    }
  };
  tryConnect();
};

module.exports = connectDB;
