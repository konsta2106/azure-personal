const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createNotFoundResponse
} = require('../utils/api-utils');

app.http('httpTriggerLanguagesGetById', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'languages/{languageId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for GET languages/{id}');

    try {
      const languageId = request.params.languageId;
      
      if (!languageId) {
        return createApiResponse(400, null, 'Language ID is required');
      }

      const cosmosService = new CosmosDbService();
      const language = await cosmosService.getItem(languageId, 'language');
      
      if (!language) {
        return createNotFoundResponse('Language', languageId);
      }

      // Transform response
      const responseData = {
        id: language.id,
        ...language.data,
        createdAt: language.createdAt,
        updatedAt: language.updatedAt
      };

      return createApiResponse(200, responseData, 'Language retrieved successfully');

    } catch (error) {
      context.log.error('Error retrieving language:', error);
      return createServerErrorResponse(error);
    }
  }
});
