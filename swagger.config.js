const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  // Définition de la spécification OpenAPI
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API pour Site d\'Événements',
      version: '1.0.0',
      description: 'Une API REST pour gérer des utilisateurs, des événements, des inscriptions et des commentaires.',
    },
    servers: [
      {
        url: 'http://localhost:8000', 
      },
    ],
    
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/**/*.js'], 
};

const specs = swaggerJsdoc(options);

module.exports = specs;