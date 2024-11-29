const gm = require('gm').subClass({ imageMagick: true });
const { promisify } = require('util');
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
 * Get PDF information using GraphicsMagick
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<Object>} PDF information
 */
const getPdfInfo = async (pdfBuffer) => {
  try {
    // Create a temporary GM instance with PDF input
    const gmInstance = gm(pdfBuffer, 'input.pdf[0]');
    
    // First, verify the PDF is readable
    await new Promise((resolve, reject) => {
      gmInstance.identify((err, value) => {
        if (err) {
          logger.error('PDF identification error:', err);
          reject(new Error('Invalid or corrupted PDF file'));
        } else {
          resolve(value);
        }
      });
    });

    // Now get the page count
    const pageCount = await new Promise((resolve, reject) => {
      gm(pdfBuffer, 'input.pdf').identify('%n', (err, value) => {
        if (err) {
          logger.error('Page count error:', err);
          reject(new Error('Could not determine page count'));
        } else {
          // Parse the page count, default to 1 if parsing fails
          const count = parseInt(value) || 1;
          resolve(count);
        }
      });
    });

    return {
      numberOfPages: pageCount,
      format: 'PDF',
      size: pdfBuffer.length
    };
  } catch (error) {
    logger.error('Error getting PDF info:', error);
    throw new Error('Failed to read PDF information: ' + error.message);
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
  try {
    const { format, additionalOptions, dpi } = options;
    
    // Create GM instance with specific page
    let pageGm = gm(pdfBuffer, `input.pdf[${pageNumber}]`)
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
    const buffer = await gmToBuffer(pageGm);
    if (!buffer || buffer.length === 0) {
      throw new Error('Conversion produced empty buffer');
    }

    return buffer;
  } catch (error) {
    logger.error(`Error converting page ${pageNumber}:`, error);
    throw new Error(`Failed to convert page ${pageNumber}: ${error.message}`);
  }
};

module.exports = {
  gmToBuffer,
  getPdfInfo,
  convertPage
};