const gm = require('gm');
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
  const gmInstance = gm(pdfBuffer, 'input.pdf');
  const identify = promisify(gmInstance.identify.bind(gmInstance));
  
  try {
    const info = await identify();
    return {
      numberOfPages: info.numberOfPages || 1,
      format: info.format,
      size: info.size
    };
  } catch (error) {
    logger.error('Error getting PDF info:', error);
    throw new Error('Failed to read PDF information');
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
  const { format, additionalOptions, dpi } = options;
  
  let pageGm = gm(pdfBuffer, 'input.pdf')
    .selectFrame(pageNumber)
    .density(dpi, dpi)
    .setFormat(format);

  // Apply additional format-specific options
  additionalOptions.forEach(option => {
    pageGm = pageGm.out(option);
  });

  return await gmToBuffer(pageGm);
};

module.exports = {
  gmToBuffer,
  getPdfInfo,
  convertPage
};