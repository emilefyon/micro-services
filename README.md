# Microservices Backend

A scalable microservices backend architecture built with Node.js, designed for reusability across multiple projects. Currently features a high-performance PDF to Image conversion service.

## Features

- 🔒 JWT Authentication
- 📄 PDF to Image Conversion Service
- 📚 OpenAPI/Swagger Documentation
- 🔍 Comprehensive Logging
- 🛡️ Security Features (Rate Limiting, CORS, Helmet)
- 🔢 API Versioning

## Getting Started

### Prerequisites

- Node.js 18 or higher
- GraphicsMagick (`gm`)
- Ghostscript

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment file and configure it:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

### Docker Installation

1. Build the Docker image:
```bash
docker build -t microservices-backend .
```

2. Run the container:
```bash
docker run -p 3000:3000 microservices-backend
```

## API Documentation

API documentation is available at `/api-docs` when the server is running. The OpenAPI specification can be accessed at `/openapi.json`.

### PDF to Image Conversion Service

Converts PDF documents to various image formats with configurable quality settings.

#### Endpoint

```
POST /api/v1/pdf/convert-to-image
```

#### Parameters

| Parameter    | Type    | Default | Description                                    |
|-------------|---------|---------|------------------------------------------------|
| file        | File    | -       | PDF file to convert (max 10MB)                 |
| startPage   | Number  | 0       | First page to convert (0-based index)          |
| endPage     | Number  | 0       | Last page to convert (0 = until last page)     |
| singleFile  | Boolean | true    | Combine all pages into a single image          |
| outputFormat| String  | png16m  | Output format (see below)                      |
| dpi         | Number  | 150     | Resolution (72-600)                            |
| quality     | Number  | 90      | JPEG quality (1-100)                           |
| backgroundColor| String  | #FFFFFF | Background color in hex format (#RGB or #RRGGBB)|

#### Output Formats

- `tifflzw`: TIFF with LZW compression (best for documents)
- `jpeg`: JPEG format with configurable quality (best for photos)
- `pnggray`: PNG grayscale 8-bit (best for black and white)
- `png256`: PNG with 256 colors (good balance)
- `png16`: PNG with 16 colors (smallest file size)
- `png16m`: PNG with millions of colors (best quality)

#### Example Request

```bash
curl -X POST http://localhost:3000/api/v1/pdf/convert-to-image \
  -F "file=@document.pdf" \
  -F "outputFormat=png256" \
  -F "dpi=150" \
  -F "singleFile=true" \
  -F "backgroundColor=#F5F5F5"
```

## Project Structure

```
.
├── src/
│   ├── gateway/          # API Gateway
│   ├── middleware/       # Shared middleware
│   ├── routes/          # Route definitions
│   ├── services/        # Microservices
│   └── utils/           # Shared utilities
├── Dockerfile           # Docker configuration
└── package.json         # Project dependencies
```

## Available Scripts

- `npm start`: Start the production server
- `npm run dev`: Start the development server with hot reload
- `npm test`: Run tests
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier

## Security Features

- JWT Authentication
- Rate Limiting
- CORS Protection
- Helmet Security Headers
- File Size Limits
- Input Validation

## Environment Variables

| Variable    | Description           | Default               |
|-------------|--------------------|----------------------|
| PORT        | Server port        | 3000                |
| NODE_ENV    | Environment        | development         |
| JWT_SECRET  | JWT signing key    | your-secret-key     |
| BASE_URL    | Base API URL       | http://localhost:3000|

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.