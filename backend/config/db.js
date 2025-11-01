const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Use a default local MongoDB URI if not provided in .env
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fintagging';
        
        const conn = await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        console.log('Continuing without database connection...');
        // Don't exit process, allow application to run without DB
        return null;
    }
};

module.exports = connectDB;
