const { logger } = require('../../../utils/logger');

/**
 * Validates if a buffer contains a valid PDF file
 * @param {Buffer} buffer - PDF file buffer to validate
 * @throws {Error} If the buffer is not a valid PDF
 */
const validatePdfBuffer = async (buffer) => {
  try {
    // Check if buffer exists and has content
    if (!buffer) {
      throw new Error('No PDF buffer received');
    }
    
    if (buffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }

    logger.debug('Validating PDF buffer', {
      size: buffer.length,
      firstBytes: buffer.slice(0, 20).toString('hex'),
      lastBytes: buffer.slice(-20).toString('hex'),
      header: buffer.slice(0, 10).toString()
    });

    // Check PDF magic number (%PDF-)
    const pdfHeader = buffer.slice(0, 5).toString();
    if (pdfHeader !== '%PDF-') {
      logger.error('Invalid PDF header detected', { 
        header: pdfHeader,
        headerHex: buffer.slice(0, 5).toString('hex')
      });
      throw new Error('Missing PDF header marker');
    }

    // Check minimum viable size for a PDF (header + EOF marker)
    if (buffer.length < 32) {
      logger.error('PDF file too small', { size: buffer.length });
      throw new Error('PDF file too small to be valid');
    }

    // Search for EOF marker in the last 1024 bytes
    const searchArea = buffer.slice(-1024);
    const eofMarkers = ['%%EOF', '%EOF', '\n%%EOF', '\r%%EOF', '\r\n%%EOF', '\x0D%%EOF', '\x0A%%EOF'];
    const hasEOF = eofMarkers.some(marker => 
      searchArea.toString().includes(marker)
    );

    if (!hasEOF) {
      logger.warn('No EOF marker found in PDF', {
        lastBytes: searchArea.slice(-20).toString('hex')
      });
      throw new Error('Missing PDF EOF marker');
    }

    logger.debug('PDF validation passed', {
      size: buffer.length,
      header: pdfHeader,
      hasEOF: hasEOF,
      version: pdfHeader.slice(5).trim()
    });
  } catch (error) {
    logger.error('PDF validation failed:', error);
    throw new Error('Invalid or corrupted PDF file: ' + error.message);
  }
};

module.exports = {
  validatePdfBuffer
};