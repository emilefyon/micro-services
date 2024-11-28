const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { errorHandler } = require('../middleware/errorHandler');
const { logger } = require('../utils/logger');
const authRoutes = require('../routes/auth.routes');
const pdfConverterRoutes = require('../services/pdfImageConverter/routes');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Microservices API',
      version: '1.0.0',
      description: 'API documentation for microservices'
    },
    servers: [
      {
        url: BASE_URL,
        description: 'Current Environment'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/services/**/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Serve OpenAPI specification as JSON
app.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocs);
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/pdf', pdfConverterRoutes);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Gateway service running on port ${PORT}`);
  logger.info(`API Documentation available at ${BASE_URL}/api-docs`);
  logger.info(`OpenAPI specification available at ${BASE_URL}/openapi.json`);
});

module.exports = app;