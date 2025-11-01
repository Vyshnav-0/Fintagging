# FinTagging - AI-Powered Financial Document Analysis

![FinTagging](https://img.shields.io/badge/FinTagging-AI%20Financial%20Analysis-6366f1)
![Status](https://img.shields.io/badge/Status-Production%20Ready-10b981)

FinTagging is an advanced AI-powered platform that automatically extracts financial data from documents and maps them to US-GAAP (United States Generally Accepted Accounting Principles) taxonomy concepts for XBRL compliance.

## 🚀 Features

- **AI-Powered Extraction (FinNI)** - Automatically identify and extract financial entities, values, and context
- **US-GAAP Mapping (FinCL)** - Link extracted data to standardized US-GAAP taxonomy concepts
- **Professional Exports** - Download results as beautifully formatted PDFs or structured CSV files
- **Fast Processing** - Get results in seconds with high accuracy
- **Secure Authentication** - Full user authentication system with email verification
- **Modern UI** - Clean, responsive interface built with Material-UI

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- Gmail account for email service (optional)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd FinTagging-Node
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Environment Configuration

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Gemini AI API
GEMINI_API_KEY=your_gemini_api_key_here

# JWT Secret
JWT_SECRET=your_secure_jwt_secret_here

# Email Service (Optional - for OTP verification)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
```

Create a `.env` file in the `frontend` directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Start the Application

From the root directory:

```bash
npm start
```

This will start both the backend server (port 5000) and frontend development server (port 3000).

## 📁 Project Structure

```
FinTagging-Node/
├── backend/
│   ├── config/          # Database and storage configuration
│   ├── controllers/     # Business logic
│   ├── data/           # JSON-based data storage
│   ├── middleware/     # Authentication middleware
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── uploads/        # Uploaded PDF files
│   └── utils/          # Utility functions and AI services
├── frontend/
│   ├── public/         # Static assets
│   └── src/
│       ├── components/ # Reusable UI components
│       ├── context/    # React context (Auth)
│       ├── pages/      # Page components
│       ├── services/   # API services
│       ├── types/      # TypeScript type definitions
│       └── utils/      # Utility functions
└── package.json        # Root package for concurrent running
```

## 🔧 How It Works

1. **Upload Document** - Upload your financial PDF document
2. **FinNI Extraction** - AI extracts financial entities, values, dates, and context
3. **FinCL Mapping** - AI maps entities to appropriate US-GAAP concepts
4. **View Results** - Interactive table showing all extracted data with US-GAAP mappings
5. **Export** - Download as professional PDF report or CSV file

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/verify-otp` - Verify email with OTP
- `POST /api/auth/set-password` - Set user password
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Analysis
- `POST /api/upload` - Upload financial document
- `GET /api/status/:reportId/status` - Get processing status
- `POST /api/finni` - Run FinNI extraction (auto-triggered)
- `POST /api/fincl` - Run FinCL mapping (auto-triggered)

## 🎨 Tech Stack

### Frontend
- React 19 with TypeScript
- Material-UI (MUI) for components
- React Router for navigation
- Axios for API calls
- jsPDF for PDF generation

### Backend
- Node.js with Express
- Google Gemini AI API
- PDF.js for PDF processing
- Nodemailer for email
- JWT for authentication

## 📊 Supported US-GAAP Concepts

The platform supports mapping to 50+ US-GAAP concepts including:
- Revenue, NetIncomeLoss, OperatingIncomeLoss
- Assets, Liabilities, StockholdersEquity
- DepreciationExpense, InterestExpense, IncomeTaxExpense
- CashAndCashEquivalents, AccountsReceivable, Inventory
- And many more...

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- Email verification with OTP
- Secure file uploads
- Protected API routes

## 📝 License

This project is proprietary software. All rights reserved.

## 👥 Contributors

- [Your Name]

## 📞 Support

For support, email [your-email@example.com] or open an issue in the repository.

---

Built with ❤️ using AI technology

