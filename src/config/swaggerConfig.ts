import swaggerJsdoc from 'swagger-jsdoc';
import express from "express";
import swaggerUi from "swagger-ui-express";
import dotenv from 'dotenv';
dotenv.config();

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Admin API',
      version: '1.0.0',
      description: 'API for managing Admins',
    },
    servers: [
      {
        url: `${process.env.SWAGGER_HOST}:${process.env.SWAGGER_PORT}`,
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
  apis: ["./src/routes/*.ts"], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Setup Swagger documentation
 * @param app - Express application instance
 */
const setupSwaggerDocs = (app: express.Application) => {
  app.use("/v1/admins/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("Swagger docs setup complete. Accessible at /v1/admins/api-docs");
};
export default setupSwaggerDocs;
