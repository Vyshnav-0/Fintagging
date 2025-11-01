const fs = require('fs').promises;
const path = require('path');

class LocalStorage {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.reportsFile = path.join(this.dataDir, 'reports.json');
        this.resultsFile = path.join(this.dataDir, 'results.json');
        this.initializeStorage();
    }

    async initializeStorage() {
        try {
            // Create data directory if it doesn't exist
            await fs.mkdir(this.dataDir, { recursive: true });

            // Initialize reports.json if it doesn't exist
            try {
                await fs.access(this.reportsFile);
            } catch {
                await fs.writeFile(this.reportsFile, JSON.stringify([], null, 2));
            }

            // Initialize results.json if it doesn't exist
            try {
                await fs.access(this.resultsFile);
            } catch {
                await fs.writeFile(this.resultsFile, JSON.stringify([], null, 2));
            }
        } catch (error) {
            console.error('Error initializing storage:', error);
        }
    }

    async readFile(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return [];
        }
    }

    async writeFile(filePath, data) {
        try {
            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
        }
    }

    async saveReport(report) {
        const reports = await this.readFile(this.reportsFile);
        const id = Date.now().toString();
        const newReport = { ...report, id, createdAt: new Date().toISOString() };
        reports.push(newReport);
        await this.writeFile(this.reportsFile, reports);
        return newReport;
    }

    async getReport(id) {
        const reports = await this.readFile(this.reportsFile);
        return reports.find(report => report.id === id);
    }

    async getAllReports() {
        return await this.readFile(this.reportsFile);
    }

    async saveResult(result) {
        const results = await this.readFile(this.resultsFile);
        const id = Date.now().toString();
        const newResult = { ...result, id, createdAt: new Date().toISOString() };
        results.push(newResult);
        await this.writeFile(this.resultsFile, results);
        return newResult;
    }

    async getResult(id) {
        const results = await this.readFile(this.resultsFile);
        return results.find(result => result.id === id);
    }

    async getResultsByReportId(reportId) {
        const results = await this.readFile(this.resultsFile);
        return results.filter(result => result.reportId === reportId);
    }

    async updateReportStatus(reportId, status) {
        const reports = await this.readFile(this.reportsFile);
        const index = reports.findIndex(report => report.id === reportId);
        if (index !== -1) {
            reports[index].status = status;
            reports[index].updatedAt = new Date().toISOString();
            await this.writeFile(this.reportsFile, reports);
            return reports[index];
        }
        return null;
    }
}

// Create singleton instance
const localStorage = new LocalStorage();

module.exports = localStorage;