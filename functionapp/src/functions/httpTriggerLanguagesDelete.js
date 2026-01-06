const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse
} = require('../utils/api-utils');

app.http('httpTriggerLanguagesDelete', {
  methods: ['DELETE'],
  authLevel: 'function',
  route: 'languages/{languageId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for DELETE languages/{languageId}');

    try {
      const languageId = request.params.languageId;
      
      if (!languageId) {
        return createApiResponse(400, null, 'Bad request', {
          message: 'Language ID is required'
        });
      }

      // Initialize Cosmos DB service
      const cosmosService = new CosmosDbService();
      await cosmosService.init();

      // Check if language exists
      const existingLanguage = await cosmosService.getItem(languageId, 'language');
      if (!existingLanguage) {
        return createApiResponse(404, null, 'Not found', {
          message: 'Language not found'
        });
      }

      // Delete the language
      await cosmosService.deleteItem(languageId, 'language');

      // Return success response
      return createApiResponse(200, null, 'Language deleted successfully');

    } catch (error) {
      context.log.error('Error deleting language:', error);
      return createServerErrorResponse('Failed to delete language');
    }
  }
});
