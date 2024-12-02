const { logger } = require('../../../utils/logger');

/**
 * Validates if a buffer contains a valid PDF file
 * @param {Buffer} buffer - PDF file buffer to validate
 * @throws {Error} If the buffer is not a valid PDF
 */
const validatePdfBuffer = async (buffer) => {
  try {
    // Check if buffer exists and has content
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty PDF buffer received');
    }

    // Check PDF magic number (%PDF-)
    const pdfHeader = buffer.slice(0, 5).toString();
    if (pdfHeader !== '%PDF-') {
      throw new Error('Invalid PDF header');
    }

    // Check minimum viable size for a PDF (header + EOF marker)
    if (buffer.length < 32) {
      throw new Error('PDF file too small to be valid');
    }

    // Check for EOF marker
    const lastBytes = buffer.slice(-5).toString();
    if (!lastBytes.includes('%%EOF')) {
      throw new Error('Missing PDF EOF marker');
    }

    logger.debug('PDF validation passed', {
      size: buffer.length,
      header: pdfHeader
    });
  } catch (error) {
    logger.error('PDF validation failed:', error);
    throw new Error('Invalid or corrupted PDF file: ' + error.message);
  }
};

module.exports = {
  validatePdfBuffer
};