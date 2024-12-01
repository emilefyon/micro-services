const gm = require('gm').subClass({ imageMagick: true });
const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { logger } = require('../../../utils/logger'); 

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
    // Ensure buffer exists and has content
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Invalid PDF buffer');
    }

    tempPath = await writeToTemp(pdfBuffer, 'pdf');
    
    // Create GM instance with PDF file
    const gmInstance = gm(tempPath);
    
    // Get PDF information
    const info = await new Promise((resolve, reject) => {
      // Set a timeout for the operation
      const timeoutId = setTimeout(() => {
        reject(new Error('PDF identification timed out after 60 seconds'));
      }, 60000);

      // Force first page only for identification
      gmInstance.identify('%p %n\n', (err, value) => {
        clearTimeout(timeoutId);
        if (err) {
          logger.error('Failed to identify PDF:', {
            error: err.toString(),
            command: gmInstance.args().join(' ')
          });
          reject(new Error('Could not read PDF file'));
        } else {
          // Parse the output to get page count
          const match = value.toString().match(/(\d+) pages?/i);
          const pageCount = match ? parseInt(match[1], 10) : null;

          logger.debug('PDF identification successful', {
            rawOutput: value,
            pageCount: pageCount
          });
          
          if (!pageCount) {
            reject(new Error('Could not determine page count from PDF'));
          }
          
          resolve({
            numberOfPages: pageCount,
            format: 'PDF',
            size: pdfBuffer.length
          });
        }
      });
    });

    return info;

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
    
    // Create GM instance with specific page
    const pageSelector = `${tempPath}[${pageNumber}]`;
    let pageGm = gm(pageSelector)
      .density(dpi, dpi)
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
  getPdfInfo,
  convertPage
};