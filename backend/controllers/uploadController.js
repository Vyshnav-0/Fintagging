const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const localStorage = require('../config/localStorage');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'uploads');
console.log('[Upload] Using directory:', uploadDir);

try {
  if (!fs.existsSync(uploadDir)) {
    console.log('[Upload] Creating directory:', uploadDir);
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.error('[Upload] Failed to create/check directory:', err.message);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      return cb(new Error('Upload directory does not exist: ' + uploadDir));
    }
    cb(null, uploadDir);
  },
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'text/html',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, HTML, DOC, and DOCX files are allowed.'), false);
  }
};

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // Set in .env or default to 10MB
  },
});

const uploadFile = async (req, res) => {
  try {
    console.log('Upload request received:', {
      body: req.body,
      file: req.file,
      headers: req.headers,
    });

    if (!req.file) {
      console.error('No file in request', { body: req.body, headers: req.headers });
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please make sure you selected a file.',
      });
    }

    // Create report entry
    const reportData = {
      fileName: req.file.originalname,
      fileType: path.extname(req.file.originalname).toUpperCase().slice(1),
      fileUrl: req.file.path,
      status: 'uploaded',
      metadata: {
        companyName: req.body.companyName,
        fiscalYear: req.body.fiscalYear,
        documentType: req.body.documentType,
      },
    };

    // Save report using local storage
    const savedReport = await localStorage.saveReport(reportData);

    // Trigger FinNI processing asynchronously
    try {
      // Import the processing function directly to avoid self-referencing HTTP calls
      const { processFinNIInternal } = require('./finniController');
      
      // Start processing but don't wait for completion if we want to return quickly
      // Or await if we want to confirm it started.
      // Here we set status to processing and return to user.
      savedReport.status = 'processing';
      await localStorage.saveReport(savedReport);

      // We use a non-blocking calling pattern for the background task
      processFinNIInternal(savedReport.id).catch(err => {
        console.error('Background processing error:', err);
      });

      res.status(200).json({
        success: true,
        message: 'File uploaded and processing started',
        data: savedReport,
      });
    } catch (processingError) {
      console.error('Error starting processing:', processingError);
      res.status(200).json({
        success: true,
        message: 'File uploaded successfully, but processing failed to start',
        data: savedReport,
        warning: processingError.message,
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message,
    });
  }
};

module.exports = {
  upload: upload.single('file'),
  uploadFile,
};
