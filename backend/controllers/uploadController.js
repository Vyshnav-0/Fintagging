const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const localStorage = require('../config/localStorage');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
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

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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
      const response = await axios.post('http://localhost:5000/api/finni', {
        reportId: savedReport.id,
      });

      savedReport.status = 'processing';
      await localStorage.saveReport(savedReport);

      if (response.data && response.data.success === false) {
        throw new Error(response.data.message || 'FinNI processing failed');
      }

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
