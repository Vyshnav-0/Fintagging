const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');

// Import routes
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const finniRoutes = require('./routes/finni');
const finclRoutes = require('./routes/fincl');
const evaluateRoutes = require('./routes/evaluate');
const reportRoutes = require('./routes/reports');
const statusRoutes = require('./routes/status');

// Import storage services
const authStorage = require('./config/authStorage');
const emailService = require('./utils/emailService');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Verify environment variables
if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error('⚠️  WARNING: Neither GEMINI_API_KEY nor OPENAI_API_KEY is set in environment variables');
    console.error('📝 Please create a .env file in the backend directory with your API keys');
    console.error('📖 See backend/SETUP.md for detailed instructions');
    console.error('');
    console.error('Example .env file:');
    console.error('GEMINI_API_KEY=your_gemini_api_key_here');
    console.error('OPENAI_API_KEY=your_openai_api_key_here');
    console.error('');
    process.exit(1);
}

// Log which AI services are available
if (process.env.GEMINI_API_KEY) {
    console.log('✓ Gemini API configured');
}
if (process.env.OPENAI_API_KEY) {
    console.log('✓ OpenAI API configured');
}

// Initialize express
const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Increase payload size limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Error handling for file uploads
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    } else if (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
    next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/finni', finniRoutes);
app.use('/api/fincl', finclRoutes);
app.use('/api/evaluate', evaluateRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/status', statusRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5000;

// Initialize storage and services before starting server
const startServer = async () => {
    try {
        await authStorage.init();
        await emailService.init();
        console.log('✅ Storage and services initialized');
        
        app.listen(PORT, () => {
            console.log(`\n🚀 Server running on port ${PORT}`);
            console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('❌ Failed to initialize server:', error);
        process.exit(1);
    }
};

startServer();
