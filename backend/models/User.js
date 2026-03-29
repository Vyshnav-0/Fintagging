class User {
    constructor(data) {
        this.id = data.id;
        this.email = data.email;
        this.name = data.name;
        this.password = data.password || null;
        this.isVerified = data.isVerified || false;
        this.otp = data.otp || null;
        this.otpExpiry = data.otpExpiry || null;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
            isVerified: this.isVerified,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = User;

