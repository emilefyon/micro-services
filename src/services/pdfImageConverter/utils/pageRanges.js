const { logger } = require('../../../utils/logger');

/**
 * Calculate the effective page range for PDF conversion
 * @param {number} startPage - Starting page (0-based index)
 * @param {number} endPage - Ending page (0 = convert all pages)
 * @param {number} totalPages - Total pages in the PDF
 * @returns {{start: number, end: number}} Validated page range
 */
const calculatePageRange = (startPage, endPage, totalPages) => {
  const start = Math.max(0, Math.min(startPage, totalPages - 1));
  const end = endPage === 0 ? totalPages - 1 : Math.min(endPage, totalPages - 1);

  if (start > end) {
    throw new Error(`Invalid page range: start page (${start}) cannot be greater than end page (${end})`);
  }

  logger.info(`Calculating page range: start=${start}, end=${end}, total=${totalPages}`);
  return { start, end };
};

module.exports = {
  calculatePageRange
};