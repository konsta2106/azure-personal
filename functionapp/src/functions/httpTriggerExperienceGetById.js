const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createNotFoundResponse
} = require('../utils/api-utils');

app.http('httpTriggerExperienceGetById', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'experience/{experienceId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for GET experience/{id}');

    try {
      const experienceId = request.params.experienceId;
      
      if (!experienceId) {
        return createApiResponse(400, null, 'Experience ID is required');
      }

      const cosmosService = new CosmosDbService();
      const experience = await cosmosService.getItem(experienceId, 'experience');
      
      if (!experience) {
        return createNotFoundResponse('Experience', experienceId);
      }

      // Transform response
      const responseData = {
        id: experience.id,
        ...experience.data,
        createdAt: experience.createdAt,
        updatedAt: experience.updatedAt
      };

      return createApiResponse(200, responseData, 'Experience retrieved successfully');

    } catch (error) {
      context.log.error('Error retrieving experience:', error);
      return createServerErrorResponse(error);
    }
  }
});