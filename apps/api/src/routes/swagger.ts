import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NextDay Public Enterprise API',
      version: '1.0.0',
      description:
        'NextDay AI-native Recruiting, Onboarding & HR Suite Developer REST API with dual auth (Bearer JWT and X-API-Key).',
      contact: {
        name: 'NextDay Developer Platform',
        url: 'https://nextday.work',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Current API Gateway Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Standard session authentication token (15-min life)',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Hashed scoped API key for third-party developer integrations',
        },
      },
    },
    security: [
      { BearerAuth: [] },
      { ApiKeyAuth: [] },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
