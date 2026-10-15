const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Ha de coincidir exactament amb el nom del .env
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB connectat: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error de connexió: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;