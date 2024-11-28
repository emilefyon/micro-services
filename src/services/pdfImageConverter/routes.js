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
 *               startPage:
 *                 type: integer
 *                 default: 0
 *               endPage:
 *                 type: integer
 *                 default: 0
 *               singleFile:
 *                 type: boolean
 *                 default: true
 *               outputFormat:
 *                 type: string
 *                 enum: [tifflzw, jpeg, pnggray, png256, png16, png16m]
 *                 default: png16m
 *     responses:
 *       200:
 *         description: PDF successfully converted to image(s)
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid parameters or file
 *       500:
 *         description: Server error
 */
router.post('/convert-to-image', 
  upload.single('file'),
  validateConvertParams,
  async (req, res) => {
    try {
      const image = await convertPdfToImage(req.file, req.body);
      res.set('Content-Type', 'image/jpeg');
      res.send(image);
    } catch (error) {
      logger.error('PDF conversion error:', error);
      res.status(500).json({ error: 'PDF conversion failed' });
    }
  }
);

module.exports = router;