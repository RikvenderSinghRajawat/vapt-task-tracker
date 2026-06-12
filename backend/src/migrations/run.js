require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');

connectDB()
  .then(async () => {
    console.log('MongoDB connection established');
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Migration failed:', error.message);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  });
