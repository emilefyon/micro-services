const express = require('express');
const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate user and get token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // This is a placeholder authentication
  // In production, implement proper user authentication
  if (username && password) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    logger.info(`User ${username} logged in successfully`);
    res.json({ token });
  } else {
    logger.warn('Login attempt failed - missing credentials');
    res.status(400).json({ error: 'Username and password are required' });
  }
});

module.exports = router;