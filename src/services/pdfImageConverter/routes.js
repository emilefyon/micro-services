const express = require('express');
const multer = require('multer');
const { validatePdfBuffer } = require('./utils/pdfValidator');
const { validateConvertParams } = require('./validators');
const { convertPdfToImage } = require('./controller');
const { logger } = require('../../utils/logger');

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * @swagger
 * /api/v1/pdf/convert-to-image:
 *   post:
 *     summary: Convert PDF pages to images
 *     description: |
 *       Converts specified pages from a PDF file to image format. The service supports various output formats
 *       and can process single or multiple pages with configurable quality settings.
 *     tags: [PDF]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The PDF file to convert (max 10MB)
 *               startPage:
 *                 type: integer
 *                 default: 0
 *                 description: First page to convert (0-based index). Default is 0 (first page)
 *               endPage:
 *                 type: integer
 *                 default: 0
 *                 description: Last page to convert (0-based index). Default is 0 (converts until last page)
 *               singleFile:
 *                 type: boolean
 *                 default: true
 *                 description: If true, combines all pages into a single image. If false, returns a zip file with separate images
 *               outputFormat:
 *                 type: string
 *                 enum: [tifflzw, jpeg, pnggray, png256, png16, png16m]
 *                 default: png16m
 *                 description: |
 *                   Image output format:
 *                   * tifflzw - TIFF with LZW compression (best for documents)
 *                   * jpeg - JPEG format with configurable quality (best for photos)
 *                   * pnggray - PNG grayscale (8-bit, best for black and white)
 *                   * png256 - PNG with 256 colors (good balance of quality and size)
 *                   * png16 - PNG with 16 colors (smallest file size)
 *                   * png16m - PNG with millions of colors (best quality)
 *               dpi:
 *                 type: integer
 *                 minimum: 72
 *                 maximum: 600
 *                 default: 150
 *                 description: Resolution in dots per inch. Higher values mean better quality but larger files
 *               quality:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 90
 *                 description: Image quality for JPEG format. Higher values mean better quality but larger files
 *               backgroundColor:
 *                 type: string
 *                 pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
 *                 default: '#FFFFFF'
 *                 description: |
 *                   Background color in hex format:
 *                   * Format: #RGB or #RRGGBB
 *                   * Default: #FFFFFF (white)
 *                   * Examples: #FFF, #F5F5F5, #000000
 *     responses:
 *       200:
 *         description: PDF successfully converted to image(s)
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid parameters or file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/convert-to-image', 
  upload.single('file'),
  validateConvertParams,
  async (req, res) => {
    try {
      logger.debug('Starting PDF conversion request', {
        fileSize: req.file?.size,
        mimeType: req.file?.mimetype,
        params: req.body
      });

      // Validate PDF before processing
      await validatePdfBuffer(req.file.buffer);
      
      const result = await convertPdfToImage(req.file, req.body);
      
      logger.debug('Conversion completed successfully', {
        resultSize: result.length,
        singleFile: req.body.singleFile
      });
      
      if (req.body.singleFile) {
        const format = req.body.outputFormat === 'tifflzw' ? 'tiff' : 
                      req.body.outputFormat.replace(/png.*/, 'png');
        res.set('Content-Type', `image/${format}`);
      } else {
        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', 'attachment; filename=converted-pages.zip');
      }
      
      res.send(result);
    } catch (error) {
      logger.error('PDF conversion error:', error);
      const errorMessage = error.message.includes('Invalid or corrupted PDF file') ?
        'The provided file appears to be corrupted or is not a valid PDF. Please check the file and try again.' :
        'PDF conversion failed: ' + error.message;
      
      res.status(500).json({ error: errorMessage });
    }
  }
);

module.exports = router;