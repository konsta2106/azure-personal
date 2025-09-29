const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse
} = require('../utils/api-utils');

app.http('httpTriggerExperienceDelete', {
  methods: ['DELETE'],
  authLevel: 'function',
  route: 'experience/{experienceId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for DELETE experience/{experienceId}');

    try {
      const experienceId = request.params.experienceId;
      
      if (!experienceId) {
        return createApiResponse(400, null, 'Bad request', {
          message: 'Experience ID is required'
        });
      }

      // Initialize Cosmos DB service
      const cosmosService = new CosmosDbService();
      await cosmosService.init();

      // Check if experience exists
      const existingExperience = await cosmosService.getItem(experienceId, 'experience');
      if (!existingExperience) {
        return createApiResponse(404, null, 'Not found', {
          message: 'Experience not found'
        });
      }

      // Delete the experience
      await cosmosService.deleteItem(experienceId, 'experience');

      // Return success response
      return createApiResponse(200, null, 'Experience deleted successfully');

    } catch (error) {
      context.log.error('Error deleting experience:', error);
      return createServerErrorResponse('Failed to delete experience');
    }
  }
});