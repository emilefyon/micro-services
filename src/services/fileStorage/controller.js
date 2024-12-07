const { logger } = require('../../utils/logger');
const fileDb = require('./database');
const { 
  calculateChecksum,
  generateFilePath,
  saveFile,
  deleteFile
} = require('./utils/fileUtils');

class FileStorageController {
  async uploadFile(req) {
    const { buffer, originalname, mimetype, size } = req.file;
    const checksum = calculateChecksum(buffer);

    // Check for duplicate file
    const existingFile = await fileDb.findByChecksum(checksum);
    if (existingFile) {
      logger.info('Duplicate file detected, returning existing file ID');
      return { id: existingFile.id, duplicate: true };
    }

    const filePath = generateFilePath(originalname);
    await saveFile(buffer, filePath);

    const fileData = {
      id: filePath.split('/').pop().split('.')[0],
      originalName: originalname,
      mimeType: mimetype,
      size: size,
      createdAt: new Date().toISOString(),
      checksum,
      path: filePath
    };

    await fileDb.insertFile(fileData);
    logger.info(`File uploaded successfully: ${fileData.id}`);
    
    return { id: fileData.id, duplicate: false };
  }

  async getFile(id) {
    const file = await fileDb.getFile(id);
    if (!file) {
      throw new Error('File not found');
    }
    return file;
  }

  async deleteFile(id) {
    const file = await fileDb.getFile(id);
    if (!file) {
      throw new Error('File not found');
    }

    await deleteFile(file.path);
    await fileDb.deleteFile(id);
    logger.info(`File deleted successfully: ${id}`);
  }

  async getStats() {
    return await fileDb.getStats();
  }
}

module.exports = new FileStorageController();