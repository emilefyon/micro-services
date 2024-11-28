const express = require('express');
const multer = require('multer');
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
 *       and can process single or multiple pages.
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
 *                   * tifflzw - TIFF with LZW compression
 *                   * jpeg - JPEG format (lossy compression)
 *                   * pnggray - PNG grayscale (8-bit)
 *                   * png256 - PNG with 256 colors
 *                   * png16 - PNG with 16 colors
 *                   * png16m - PNG with millions of colors (24-bit)
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
      const result = await convertPdfToImage(req.file, req.body);
      
      if (req.body.singleFile) {
        res.set('Content-Type', `image/${req.body.outputFormat === 'tifflzw' ? 'tiff' : req.body.outputFormat.replace(/png.*/, 'png')}`);
      } else {
        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', 'attachment; filename=converted-pages.zip');
      }
      
      res.send(result);
    } catch (error) {
      logger.error('PDF conversion error:', error);
      res.status(500).json({ error: 'PDF conversion failed: ' + error.message });
    }
  }
);

module.exports = router;