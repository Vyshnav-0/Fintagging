const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

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

const PORT = process.env.PORT || 5000;

// Verify environment variables
// Important: controllers already implement local fallbacks when keys are missing.
// Don't hard-crash the server so the frontend can still be used for testing.
if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: Neither GEMINI_API_KEY nor OPENAI_API_KEY is set.');
    console.warn('📝 Backend will run in fallback mode (AI features may be reduced).');
    // Mark for downstream services that external AI is disabled.
    process.env.AI_DISABLED = 'true';
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
    origin: process.env.ALLOWED_ORIGIN === '*' ? true : (process.env.ALLOWED_ORIGIN || true),
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

// Serve static files (Frontend assets flattened to root)
app.use(express.static(path.join(__dirname)));
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

// SPA fallback: Express 5 / path-to-regexp v8 rejects the pattern '/*'. Use middleware instead.
app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();

    const localIndex = path.join(__dirname, 'index.html');
    if (fs.existsSync(localIndex)) {
        return res.sendFile(localIndex);
    }
    return res.status(404).json({
        success: false,
        message: 'Frontend asset not found. If this is development, use the frontend dev server on port 3000.'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Port is defined at the top

// Initialize storage and services before starting server
const startServer = async () => {
    try {
        await authStorage.init();
        await emailService.init();
        console.log('✅ Storage and services initialized');
        
        console.log(`📡 Attempting to start server on port ${PORT}...`);
        const server = app.listen(PORT, () => {
            console.log(`\n🚀 Server running on port ${PORT}`);
            console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
        });
        
        server.on('error', (err) => {
            console.error('❌ Server startup error:', err);
        });

    } catch (error) {
        console.error('❌ Failed to initialize server:', error);
        process.exit(1);
    }
};

startServer();
