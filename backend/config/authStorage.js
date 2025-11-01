const fs = require('fs').promises;
const path = require('path');
const User = require('../models/User');

class AuthStorage {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.usersFile = path.join(this.dataDir, 'users.json');
        this.sessionsFile = path.join(this.dataDir, 'sessions.json');
        this.users = new Map();
        this.sessions = new Map();
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            
            // Load users
            try {
                const usersData = await fs.readFile(this.usersFile, 'utf8');
                const usersArray = JSON.parse(usersData);
                usersArray.forEach(userData => {
                    const user = new User(userData);
                    this.users.set(user.id, user);
                });
                console.log(`Loaded ${this.users.size} users`);
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
                await fs.writeFile(this.usersFile, '[]', 'utf8');
                console.log('Created users.json file');
            }

            // Load sessions
            try {
                const sessionsData = await fs.readFile(this.sessionsFile, 'utf8');
                const sessionsArray = JSON.parse(sessionsData);
                sessionsArray.forEach(session => {
                    this.sessions.set(session.token, session);
                });
                console.log(`Loaded ${this.sessions.size} sessions`);
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
                await fs.writeFile(this.sessionsFile, '[]', 'utf8');
                console.log('Created sessions.json file');
            }

            this.initialized = true;
        } catch (error) {
            console.error('Error initializing auth storage:', error);
            throw error;
        }
    }

    async saveUsers() {
        const usersArray = Array.from(this.users.values()).map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            password: user.password,
            isVerified: user.isVerified,
            otp: user.otp,
            otpExpiry: user.otpExpiry,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        }));
        await fs.writeFile(this.usersFile, JSON.stringify(usersArray, null, 2), 'utf8');
    }

    async saveSessions() {
        const sessionsArray = Array.from(this.sessions.values());
        await fs.writeFile(this.sessionsFile, JSON.stringify(sessionsArray, null, 2), 'utf8');
    }

    // User operations
    async createUser(userData) {
        const user = new User({
            ...userData,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        });
        this.users.set(user.id, user);
        await this.saveUsers();
        return user;
    }

    async getUserById(id) {
        return this.users.get(id) || null;
    }

    async getUserByEmail(email) {
        return Array.from(this.users.values()).find(user => user.email === email) || null;
    }

    async updateUser(id, updates) {
        const user = this.users.get(id);
        if (!user) return null;

        Object.assign(user, updates, { updatedAt: new Date().toISOString() });
        await this.saveUsers();
        return user;
    }

    async deleteUser(id) {
        const deleted = this.users.delete(id);
        if (deleted) await this.saveUsers();
        return deleted;
    }

    // Session operations
    async createSession(userId, token, expiresAt) {
        const session = {
            userId,
            token,
            expiresAt,
            createdAt: new Date().toISOString()
        };
        this.sessions.set(token, session);
        await this.saveSessions();
        return session;
    }

    async getSession(token) {
        const session = this.sessions.get(token);
        if (!session) return null;

        // Check if expired
        if (new Date(session.expiresAt) < new Date()) {
            await this.deleteSession(token);
            return null;
        }

        return session;
    }

    async deleteSession(token) {
        const deleted = this.sessions.delete(token);
        if (deleted) await this.saveSessions();
        return deleted;
    }

    async deleteUserSessions(userId) {
        const userSessions = Array.from(this.sessions.entries())
            .filter(([, session]) => session.userId === userId);
        
        userSessions.forEach(([token]) => this.sessions.delete(token));
        
        if (userSessions.length > 0) {
            await this.saveSessions();
        }
        
        return userSessions.length;
    }
}

const authStorage = new AuthStorage();
module.exports = authStorage;

