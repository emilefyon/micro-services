const { PDFDocument } = require('pdf-lib');
const { logger } = require('../../../utils/logger');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

/**
 * Render a PDF page to an image buffer
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @param {number} pageNumber - Page number to render (0-based)
 * @param {number} dpi - Resolution in DPI
 * @returns {Promise<Buffer>} PNG buffer of the rendered page
 */
const renderPdfPageToImage = async (pdfBuffer, pageNumber, dpi) => {
  try {
    // Create temporary file path
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-'));
    const tmpPdfPath = path.join(tmpDir, `page-${pageNumber}.pdf`);
    const tmpPngPath = path.join(tmpDir, `page-${pageNumber}.png`);

    // Write PDF buffer to temp file
    await fs.writeFile(tmpPdfPath, pdfBuffer);

    try {
      // Use pdftoppm to convert PDF to PNG with high quality
      const pageArg = `${pageNumber + 1}`; // pdftoppm uses 1-based page numbers
      await exec(`pdftoppm -f ${pageArg} -l ${pageArg} -png -r ${dpi} "${tmpPdfPath}" "${tmpPngPath.replace('.png', '')}"`);

      // Read the generated PNG
      const pngPath = `${tmpPngPath.replace('.png', '')}-${pageArg}.png`;
      const imageBuffer = await fs.readFile(pngPath);

      // Process with sharp for any additional image operations
      const result = await sharp(imageBuffer)
        .png()
        .toBuffer();

      return result;
    } finally {
      // Cleanup temporary files
      await fs.unlink(tmpPdfPath);
      const pngPath = `${tmpPngPath.replace('.png', '')}-${pageNumber + 1}.png`;
      await fs.unlink(pngPath).catch(() => {}); // Ignore if file doesn't exist
      await fs.rmdir(tmpDir);
    }

  } catch (error) {
    logger.error('PDF rendering error:', error);
    throw new Error(`Failed to render PDF page ${pageNumber}: ${error.message}`);
  } 
};

module.exports = {
  renderPdfPageToImage
};