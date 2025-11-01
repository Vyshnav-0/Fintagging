const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authStorage = require('../config/authStorage');
const emailService = require('../utils/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = '7d';
const OTP_EXPIRY_MINUTES = 10;

// Helper to generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Sign up - Step 1: Register email and name
exports.signup = async (req, res) => {
    try {
        const { email, name } = req.body;

        // Validation
        if (!email || !name) {
            return res.status(400).json({
                success: false,
                message: 'Email and name are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check if user already exists
        const existingUser = await authStorage.getUserByEmail(email);
        if (existingUser) {
            if (existingUser.isVerified) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already registered. Please login.'
                });
            } else {
                // User exists but not verified, resend OTP
                const otp = emailService.generateOTP();
                const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
                
                await authStorage.updateUser(existingUser.id, {
                    name,
                    otp,
                    otpExpiry
                });

                await emailService.sendOTP(email, name, otp);

                return res.status(200).json({
                    success: true,
                    message: 'OTP resent to your email',
                    data: {
                        userId: existingUser.id,
                        email: existingUser.email,
                        name
                    }
                });
            }
        }

        // Generate OTP
        const otp = emailService.generateOTP();
        const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

        // Create user (unverified)
        const user = await authStorage.createUser({
            email,
            name,
            otp,
            otpExpiry,
            isVerified: false
        });

        // Send OTP email
        await emailService.sendOTP(email, name, otp);

        res.status(201).json({
            success: true,
            message: 'OTP sent to your email. Please verify to continue.',
            data: {
                userId: user.id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during signup',
            error: error.message
        });
    }
};

// Verify OTP - Step 2
exports.verifyOTP = async (req, res) => {
    try {
        const { userId, otp } = req.body;

        if (!userId || !otp) {
            return res.status(400).json({
                success: false,
                message: 'User ID and OTP are required'
            });
        }

        const user = await authStorage.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if already verified
        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email already verified. Please set your password or login.'
            });
        }

        // Check OTP expiry
        if (new Date() > new Date(user.otpExpiry)) {
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Verify OTP
        if (user.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please try again.'
            });
        }

        // Mark as verified and clear OTP
        await authStorage.updateUser(userId, {
            isVerified: true,
            otp: null,
            otpExpiry: null
        });

        res.status(200).json({
            success: true,
            message: 'Email verified successfully. Please set your password.',
            data: {
                userId: user.id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying OTP',
            error: error.message
        });
    }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const user = await authStorage.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email already verified'
            });
        }

        // Generate new OTP
        const otp = emailService.generateOTP();
        const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

        await authStorage.updateUser(userId, { otp, otpExpiry });
        await emailService.sendOTP(user.email, user.name, otp);

        res.status(200).json({
            success: true,
            message: 'New OTP sent to your email'
        });
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resending OTP',
            error: error.message
        });
    }
};

// Set Password - Step 3
exports.setPassword = async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({
                success: false,
                message: 'User ID and password are required'
            });
        }

        // Password validation
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        const user = await authStorage.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Please verify your email first'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const updatedUser = await authStorage.updateUser(userId, { password: hashedPassword });

        // Generate JWT token
        const token = generateToken(updatedUser.id);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        
        await authStorage.createSession(updatedUser.id, token, expiresAt);

        res.status(200).json({
            success: true,
            message: 'Password set successfully. You are now logged in!',
            data: {
                token,
                user: updatedUser.toJSON()
            }
        });
    } catch (error) {
        console.error('Set password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error setting password',
            error: error.message
        });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const user = await authStorage.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        if (!user.isVerified) {
            return res.status(401).json({
                success: false,
                message: 'Please verify your email first',
                requiresVerification: true,
                userId: user.id
            });
        }

        if (!user.password) {
            return res.status(401).json({
                success: false,
                message: 'Please complete your registration by setting a password',
                requiresPasswordSetup: true,
                userId: user.id
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = generateToken(user.id);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        
        await authStorage.createSession(user.id, token, expiresAt);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: user.toJSON()
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during login',
            error: error.message
        });
    }
};

// Logout
exports.logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (token) {
            await authStorage.deleteSession(token);
        }

        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout',
            error: error.message
        });
    }
};

// Get current user
exports.getMe = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            data: {
                user: req.user.toJSON()
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error.message
        });
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        // Password validation
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        const user = req.user;

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Check if new password is same as current
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different from current password'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await authStorage.updateUser(user.id, { password: hashedPassword });

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error changing password',
            error: error.message
        });
    }
};

// Delete account
exports.deleteAccount = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required to delete account'
            });
        }

        const user = req.user;

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect password'
            });
        }

        // Delete all user sessions
        await authStorage.deleteUserSessions(user.id);

        // Delete user account
        await authStorage.deleteUser(user.id);

        res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting account',
            error: error.message
        });
    }
};

