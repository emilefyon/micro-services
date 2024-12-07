const { PDFDocument } = require('pdf-lib');
const { logger } = require('../../../utils/logger');

/**
 * Get PDF information using pdf-lib
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<Object>} PDF information
 */
const getPdfInfo = async (pdfBuffer) => {
  try {
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Invalid PDF buffer');
    }

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();

    logger.debug('PDF identification successful', {
      pageCount: pageCount,
      size: pdfBuffer.length
    });

    if (!pageCount || pageCount < 1) {
      throw new Error('PDF document contains no pages');
    }

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

module.exports = {
  getPdfInfo
};