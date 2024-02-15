const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = async () => {
  try {
    const mongooseURI = `${process.env.MONGO_URI}${process.env.DATABASE}`;
    const db = await mongoose.connect(mongooseURI);
    console.log('Successfully connected to MongoDB!');

    return db;
  } catch (err) {
    console.error(err.message);
    process.exit(-1);
  }
};

module.exports = connectDB;
