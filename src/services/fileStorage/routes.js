const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { validateUpload } = require('./validators');
const controller = require('./controller');
const config = require('./config');
const { logger } = require('../../utils/logger');

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: config.storage.maxFileSize }
});

// Rate limiting
const limiter = rateLimit(config.rateLimit);
router.use(limiter);

/**
 * @swagger
 * /api/v1/files:
 *   post:
 *     summary: Upload a file
 *     tags: [Files]
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
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 duplicate:
 *                   type: boolean
 */
router.post('/', upload.single('file'), validateUpload, async (req, res) => {
  try {
    const result = await controller.uploadFile(req);
    res.json(result);
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

/**
 * @swagger
 * /api/v1/files/{id}:
 *   get:
 *     summary: Download a file
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id', async (req, res) => {
  try {
    const file = await controller.getFile(req.params.id);
    res.sendFile(file.path);
  } catch (error) {
    logger.error('Download error:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

/**
 * @swagger
 * /api/v1/files/{id}:
 *   delete:
 *     summary: Delete a file
 *     tags: [Files]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 */
router.delete('/:id', async (req, res) => {
  try {
    await controller.deleteFile(req.params.id);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    logger.error('Delete error:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

/**
 * @swagger
 * /api/v1/files/stats:
 *   get:
 *     summary: Get storage statistics
 *     tags: [Files]
 *     responses:
 *       200:
 *         description: Storage statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalFiles:
 *                   type: number
 *                 totalSize:
 *                   type: number
 *                 oldestFile:
 *                   type: string
 *                 newestFile:
 *                   type: string
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await controller.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;