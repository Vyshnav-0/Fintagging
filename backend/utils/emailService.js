const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        const emailConfig = {
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        };

        // Check if email credentials are provided
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.warn('⚠️  Email credentials not configured. Using console logging for OTP.');
            console.warn('   To enable email sending, add EMAIL_USER and EMAIL_PASSWORD to .env file');
            this.transporter = null;
        } else {
            try {
                this.transporter = nodemailer.createTransport(emailConfig);
                await this.transporter.verify();
                console.log('✅ Email service initialized successfully');
                this.initialized = true;
            } catch (error) {
                console.warn('⚠️  Email service initialization failed. Using console logging for OTP.');
                console.warn('   Error:', error.message);
                this.transporter = null;
            }
        }
    }

    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    getOTPEmailTemplate(name, otp) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
        
        <!-- Header with gradient -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Email Verification</h1>
            <p style="color: #e9d8fd; margin: 10px 0 0; font-size: 14px;">FinTagging Platform</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hi <strong>${name}</strong>,
            </p>
            
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 30px;">
                Thank you for signing up! Please use the following One-Time Password (OTP) to verify your email address:
            </p>

            <!-- OTP Box -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 30px; text-align: center; margin: 0 0 30px;">
                <p style="color: #ffffff; font-size: 14px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
                <div style="background-color: rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 20px; display: inline-block;">
                    <span style="color: #ffffff; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                </div>
            </div>

            <div style="background-color: #fef3cd; border-left: 4px solid #f6c343; padding: 15px; border-radius: 6px; margin: 0 0 30px;">
                <p style="color: #856404; font-size: 14px; margin: 0; line-height: 1.5;">
                    ⏰ <strong>Important:</strong> This OTP will expire in <strong>10 minutes</strong>. Please complete your verification promptly.
                </p>
            </div>

            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 15px;">
                If you didn't request this verification, please ignore this email or contact our support team.
            </p>

            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                Best regards,<br>
                <strong style="color: #667eea;">FinTagging Team</strong>
            </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="color: #999999; font-size: 12px; margin: 0 0 10px;">
                This is an automated message, please do not reply to this email.
            </p>
            <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} FinTagging. All rights reserved.
            </p>
        </div>

    </div>
</body>
</html>
        `.trim();
    }

    async sendOTP(email, name, otp) {
        // If no transporter, log to console
        if (!this.transporter) {
            console.log('\n═══════════════════════════════════════');
            console.log('📧 OTP EMAIL (Console Mode)');
            console.log('═══════════════════════════════════════');
            console.log(`To: ${email}`);
            console.log(`Name: ${name}`);
            console.log(`OTP: ${otp}`);
            console.log(`Expires: 10 minutes`);
            console.log('═══════════════════════════════════════\n');
            return { success: true, mode: 'console' };
        }

        try {
            const mailOptions = {
                from: `"FinTagging" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Verify Your Email - FinTagging',
                html: this.getOTPEmailTemplate(name, otp)
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ OTP email sent successfully:', info.messageId);
            return { success: true, mode: 'email', messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending OTP email:', error);
            
            // Fallback to console
            console.log('\n═══════════════════════════════════════');
            console.log('📧 OTP EMAIL (Fallback to Console)');
            console.log('═══════════════════════════════════════');
            console.log(`To: ${email}`);
            console.log(`Name: ${name}`);
            console.log(`OTP: ${otp}`);
            console.log(`Expires: 10 minutes`);
            console.log('═══════════════════════════════════════\n');
            
            return { success: true, mode: 'console', error: error.message };
        }
    }
}

const emailService = new EmailService();
module.exports = emailService;

