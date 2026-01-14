const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Attendance App API',
      version: '1.0.0',
      description: '出欠管理システムのAPIドキュメントです。',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3001}/api`,
        description: '開発サーバー',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // APIファイルへのパス
  apis: ['./routes/*.js'], 
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};
