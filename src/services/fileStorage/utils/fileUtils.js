const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../../../utils/logger');
const config = require('../config');

/**
 * Calculate file checksum
 * @param {Buffer} buffer - File buffer
 * @returns {string} SHA-256 checksum
 */
const calculateChecksum = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Generate unique file path
 * @param {string} originalName - Original file name
 * @returns {string} Unique file path
 */
const generateFilePath = (originalName) => {
  const ext = path.extname(originalName);
  const uuid = uuidv4();
  return path.join(
    config.storage.basePath,
    `${uuid}${ext}`
  );
};

/**
 * Save file to disk
 * @param {Buffer} buffer - File buffer
 * @param {string} filePath - Target file path
 */
const saveFile = async (buffer, filePath) => {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    logger.debug(`File saved successfully: ${filePath}`);
  } catch (error) {
    logger.error('Error saving file:', error);
    throw new Error('Failed to save file');
  }
};

/**
 * Delete file from disk
 * @param {string} filePath - File path to delete
 */
const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    logger.debug(`File deleted successfully: ${filePath}`);
  } catch (error) {
    logger.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
};

module.exports = {
  calculateChecksum,
  generateFilePath,
  saveFile,
  deleteFile
};