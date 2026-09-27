const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QMetric API',
      version: '1.0.0',
      description:
        'Academic Context Management System (ACMS) — Question Paper Quality Evaluation API',
      contact: {
        name: 'QMetric Support',
        email: 'support@qmetric.edu',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
      // Add additional servers only when explicitly configured
      ...(process.env.BACKEND_URL && process.env.BACKEND_URL !== (process.env.API_URL || 'http://localhost:5000')
        ? [{
            url: process.env.BACKEND_URL,
            description: 'Deployed environment',
          }]
        : []),
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'HttpOnly cookie set on login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string' },
            role: {
              type: 'string',
              enum: ['teacher', 'reviewer', 'admin', 'super_admin'],
            },
            collegeId: { type: 'string', nullable: true },
            collegeName: { type: 'string' },
            isBlocked: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Paper: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            courseName: { type: 'string' },
            courseCode: { type: 'string' },
            reviewStatus: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected', 'needs_revision'],
            },
            qualityScore: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        College: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            code: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Something went wrong' },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
  },
  apis: ['./routes/*.js'],
};

const specs = swaggerJsDoc(options);

/**
 * Mounts the Swagger UI at /api-docs.
 * Named export so the module is identifiable in stack traces and code search.
 */
function setupSwagger(app) {
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
      },
      customSiteTitle: 'QMetric API Docs',
    })
  );
  console.log('📚 API docs available at /api-docs');
}

module.exports = setupSwagger;