const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse
} = require('../utils/api-utils');

app.http('httpTriggerEducationDelete', {
  methods: ['DELETE'],
  authLevel: 'function',
  route: 'education/{educationId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for DELETE education/{educationId}');

    try {
      const educationId = request.params.educationId;
      
      if (!educationId) {
        return createApiResponse(400, null, 'Bad request', {
          message: 'Education ID is required'
        });
      }

      // Initialize Cosmos DB service
      const cosmosService = new CosmosDbService();
      await cosmosService.init();

      // Check if education exists
      const existingEducation = await cosmosService.getItem(educationId, 'education');
      if (!existingEducation) {
        return createApiResponse(404, null, 'Not found', {
          message: 'Education not found'
        });
      }

      // Delete the education
      await cosmosService.deleteItem(educationId, 'education');

      // Return success response
      return createApiResponse(200, null, 'Education deleted successfully');

    } catch (error) {
      context.log.error('Error deleting education:', error);
      return createServerErrorResponse('Failed to delete education');
    }
  }
});
