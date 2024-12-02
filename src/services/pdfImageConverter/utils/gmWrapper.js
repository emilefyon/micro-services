const gm = require('gm').subClass({ imageMagick: true });
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { logger } = require('../../../utils/logger');
const { validatePdfBuffer } = require('./pdfValidator');

/**
 * Promisified version of GraphicsMagick's toBuffer
 * @param {Object} gmObject - GraphicsMagick object
 * @returns {Promise<Buffer>} Image buffer
 */
const gmToBuffer = async (gmObject) => {
  return new Promise((resolve, reject) => {
    gmObject.toBuffer((err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
};

/**
 * Write buffer to temporary file
 * @param {Buffer} buffer - File buffer
 * @param {string} extension - File extension
 * @returns {Promise<string>} Temporary file path
 */
const writeToTemp = async (buffer, extension) => {
  const tempPath = path.join(os.tmpdir(), `pdf-${Date.now()}.${extension}`);
  await fs.writeFile(tempPath, buffer);
  return tempPath;
};

/**
 * Clean up temporary file
 * @param {string} filePath - File path to remove
 */
const cleanupTemp = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    logger.warn('Failed to cleanup temp file:', error);
  }
};

/**
 * Get PDF information using GraphicsMagick
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<Object>} PDF information
 */
const getPdfInfo = async (pdfBuffer) => {
  let tempPath = null;
  try {
    // Write PDF to temporary file
    tempPath = await writeToTemp(pdfBuffer, 'pdf');
    
    // Create GM instance with PDF file
    const gmInstance = gm(tempPath);
    
    // Add debug logging for GM command
    logger.debug('Running GM identify command', {
      tempPath,
      command: gmInstance.args()
    });
    
    // Get PDF information
    const info = await new Promise((resolve, reject) => {
      gmInstance.identify((err, value) => {
        if (err) {
          logger.error('GM identify failed:', {
            error: err.message,
            command: err.command,
            output: err.output
          });
          reject(new Error('Invalid or corrupted PDF file'));
        } else {
          logger.debug('GM identify succeeded', { info: value });
          resolve(value);
        }
      });
    });

    // Parse page count from info
    const pageCount = info.numberOfPages || 1;

    return {
      numberOfPages: pageCount,
      format: 'PDF',
      size: pdfBuffer.length
    };
  } catch (error) {
    logger.error('Error getting PDF info:', error);
    throw new Error('Failed to read PDF information: ' + error.message);
  } finally {
    if (tempPath) {
      await cleanupTemp(tempPath);
    }
  }
};

/**
 * Convert a single PDF page to image
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {number} pageNumber - Page number to convert
 * @param {Object} options - Conversion options
 * @returns {Promise<Buffer>} Converted image buffer
 */
const convertPage = async (pdfBuffer, pageNumber, options) => {
  let tempPath = null;
  try {
    // Write PDF to temporary file
    tempPath = await writeToTemp(pdfBuffer, 'pdf');
    
    const { format, additionalOptions, dpi } = options;
    
    // Add debug logging for conversion
    logger.debug('Starting page conversion', {
      pageNumber,
      format,
      dpi,
      tempPath
    });
    
    // Create GM instance with specific page
    let pageGm = gm(tempPath + `[${pageNumber}]`)
      .density(dpi, dpi)
      .setFormat(format)
      .quality(options.quality || 90)
      .strip(); // Remove metadata to reduce size

    // Apply additional format-specific options
    if (additionalOptions && additionalOptions.length > 0) {
      additionalOptions.forEach(option => {
        pageGm = pageGm.out(...(Array.isArray(option) ? option : [option]));
      });
    }

    // Convert to buffer
    const buffer = await gmToBuffer(pageGm);
    if (!buffer || buffer.length === 0) {
      throw new Error(`Conversion produced empty buffer for page ${pageNumber}`);
    }

    return buffer;
  } catch (error) {
    logger.error('Error converting page:', {
      pageNumber,
      error: error.message,
      command: error.command,
      output: error.output
    });
    throw new Error(`Failed to convert page ${pageNumber}: ${error.message}`);
  } finally {
    if (tempPath) {
      await cleanupTemp(tempPath);
    }
  }
};

module.exports = {
  gmToBuffer,
  getPdfInfo,
  convertPage
};