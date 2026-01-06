const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse
} = require('../utils/api-utils');

app.http('httpTriggerCertificationsDelete', {
  methods: ['DELETE'],
  authLevel: 'function',
  route: 'certifications/{certificationId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for DELETE certifications/{certificationId}');

    try {
      const certificationId = request.params.certificationId;
      
      if (!certificationId) {
        return createApiResponse(400, null, 'Bad request', {
          message: 'Certification ID is required'
        });
      }

      // Initialize Cosmos DB service
      const cosmosService = new CosmosDbService();
      await cosmosService.init();

      // Check if certification exists
      const existingCertification = await cosmosService.getItem(certificationId, 'certification');
      if (!existingCertification) {
        return createApiResponse(404, null, 'Not found', {
          message: 'Certification not found'
        });
      }

      // Delete the certification
      await cosmosService.deleteItem(certificationId, 'certification');

      // Return success response
      return createApiResponse(200, null, 'Certification deleted successfully');

    } catch (error) {
      context.log.error('Error deleting certification:', error);
      return createServerErrorResponse('Failed to delete certification');
    }
  }
});
