const gm = require('gm').subClass({ imageMagick: true });
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { logger } = require('../../../utils/logger');
const { getPdfInfo } = require('./pdfInfo');
// Ensure tmp directory exists and is writable
const TMP_DIR = '/tmp/pdf-converter';

const ensureTmpDir = async () => {
  try {
    await fs.mkdir(TMP_DIR, { recursive: true });
    logger.debug('Temporary directory created:', { path: TMP_DIR });
  } catch (error) {
    logger.error('Failed to create temporary directory:', error);
    throw new Error('Could not create temporary directory');
  }
};

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
  await ensureTmpDir();
  const tempPath = path.join(TMP_DIR, `pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`);
  await fs.writeFile(tempPath, buffer);
  logger.debug('Wrote temporary file', { path: tempPath, size: buffer.length });
  return tempPath;
};

/**
 * Clean up temporary file
 * @param {string} filePath - File path to remove
 */
const cleanupTemp = async (filePath) => {
  try {
    await fs.unlink(filePath);
    logger.debug('Cleaned up temporary file:', { path: filePath });
  } catch (error) {
    logger.warn('Failed to cleanup temp file:', error);
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
    
    // Create GM instance with specific page
    const pageSelector = `${tempPath}[${pageNumber}]`;
    let pageGm = gm(pageSelector)
      .density(dpi, dpi)
      .background(options.backgroundColor)
      .flatten() // Ensures background color is applied
      .setFormat(format)
      .quality(options.quality || 90);

    // Apply additional format-specific options
    if (additionalOptions && additionalOptions.length > 0) {
      additionalOptions.forEach(option => {
        pageGm = pageGm.out(...(Array.isArray(option) ? option : [option]));
      });
    }

    // Convert to buffer
    logger.debug('Converting page to buffer', {
      pageNumber,
      format,
      command: pageGm.args().join(' ')
    });

    const buffer = await new Promise((resolve, reject) => {
      // Set a timeout for the conversion
      const timeoutId = setTimeout(() => {
        reject(new Error('Page conversion timed out after 60 seconds'));
      }, 60000);

      pageGm.toBuffer((err, buffer) => {
        clearTimeout(timeoutId);
        if (err) reject(err);
        else resolve(buffer);
      });
    });

    if (!buffer || buffer.length === 0) {
      throw new Error(`Conversion produced empty buffer for page ${pageNumber}`);
    }

    logger.debug('Page conversion successful', {
      pageNumber,
      bufferSize: buffer.length
    });

    return buffer;
  } catch (error) {
    logger.error('Page conversion failed:', {
      pageNumber,
      error: error.toString(),
      tempPath
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
  convertPage
};