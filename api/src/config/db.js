const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connectat: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error de connexió: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;