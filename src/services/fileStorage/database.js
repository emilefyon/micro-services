const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { logger } = require('../../utils/logger');

class FileDatabase {
  constructor() {
    const dbPath = path.join(process.env.FILE_STORAGE_PATH || '/data/files', 'files.db');
    const dbDir = path.dirname(dbPath);

    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      try {
        fs.mkdirSync(dbDir, { recursive: true });
        logger.info(`Created database directory: ${dbDir}`);
      } catch (error) {
        logger.error('Failed to create database directory:', error);
        throw error;
      }
    }

    try {
      this.db = new Database(dbPath);
      logger.info(`Connected to database: ${dbPath}`);
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }

    this.init();
  }

  init() {
    const createTable = `
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        originalName TEXT NOT NULL,
        mimeType TEXT NOT NULL,
        size INTEGER NOT NULL,
        createdAt DATETIME NOT NULL,
        checksum TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE
      )
    `;

    try {
      this.db.exec(createTable);
      logger.info('File storage database initialized');
    } catch (error) {
      logger.error('Database initialization error:', error);
      throw error;
    }
  }

  insertFile(fileData) {
    const stmt = this.db.prepare(`
      INSERT INTO files (id, originalName, mimeType, size, createdAt, checksum, path)
      VALUES (@id, @originalName, @mimeType, @size, @createdAt, @checksum, @path)
    `);
    return stmt.run(fileData);
  }

  getFile(id) {
    const stmt = this.db.prepare('SELECT * FROM files WHERE id = ?');
    return stmt.get(id);
  }

  deleteFile(id) {
    const stmt = this.db.prepare('DELETE FROM files WHERE id = ?');
    return stmt.run(id);
  }

  getFiles(limit = 20, offset = 0) {
    const stmt = this.db.prepare('SELECT * FROM files ORDER BY createdAt DESC LIMIT ? OFFSET ?');
    return stmt.all(limit, offset);
  }

  getStats() {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as totalFiles,
        SUM(size) as totalSize,
        MIN(createdAt) as oldestFile,
        MAX(createdAt) as newestFile
      FROM files
    `);
    return stmt.get();
  }

  findByChecksum(checksum) {
    const stmt = this.db.prepare('SELECT * FROM files WHERE checksum = ?');
    return stmt.get(checksum);
  }
}

module.exports = new FileDatabase();