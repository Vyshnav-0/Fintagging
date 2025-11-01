// Simple in-memory storage for development
class MemoryStorage {
    constructor() {
        this.reports = new Map();
        this.results = new Map();
    }

    // Report methods
    saveReport(report) {
        const id = Date.now().toString();
        this.reports.set(id, { ...report, id });
        return { ...report, id };
    }

    getReport(id) {
        return this.reports.get(id);
    }

    getAllReports() {
        return Array.from(this.reports.values());
    }

    // Result methods
    saveResult(result) {
        const id = Date.now().toString();
        this.results.set(id, { ...result, id });
        return { ...result, id };
    }

    getResult(id) {
        return this.results.get(id);
    }

    getResultsByReportId(reportId) {
        return Array.from(this.results.values())
            .filter(result => result.reportId === reportId);
    }
}

// Create singleton instance
const memoryStorage = new MemoryStorage();

module.exports = memoryStorage;