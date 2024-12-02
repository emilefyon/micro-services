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

    logger.debug('Validating PDF buffer', {
      size: buffer.length,
      firstBytes: buffer.slice(0, 10).toString('hex'),
      lastBytes: buffer.slice(-10).toString('hex')
    });

    // Check PDF magic number (%PDF-)
    const pdfHeader = buffer.slice(0, 5).toString();
    if (pdfHeader !== '%PDF-') {
      logger.error('Invalid PDF header', { header: pdfHeader });
      throw new Error('Invalid PDF header');
    }

    // Check minimum viable size for a PDF (header + EOF marker)
    if (buffer.length < 32) {
      logger.error('PDF file too small', { size: buffer.length });
      throw new Error('PDF file too small to be valid');
    }

    // Search for EOF marker in the last 1024 bytes
    const searchArea = buffer.slice(-1024);
    const eofMarkers = ['%%EOF', '%EOF', '\n%%EOF', '\r%%EOF', '\r\n%%EOF'];
    const hasEOF = eofMarkers.some(marker => 
      searchArea.toString().includes(marker)
    );

    if (!hasEOF) {
      logger.warn('No standard EOF marker found, but continuing processing', {
        lastBytes: searchArea.slice(-20).toString('hex')
      });
    }

    logger.debug('PDF validation passed', {
      size: buffer.length,
      header: pdfHeader,
      hasEOF: hasEOF
    });
  } catch (error) {
    logger.error('PDF validation failed:', error);
    throw new Error('Invalid or corrupted PDF file: ' + error.message);
  }
};

module.exports = {
  validatePdfBuffer
};