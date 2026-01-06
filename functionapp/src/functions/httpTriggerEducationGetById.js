const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createNotFoundResponse
} = require('../utils/api-utils');

app.http('httpTriggerEducationGetById', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'education/{educationId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for GET education/{id}');

    try {
      const educationId = request.params.educationId;
      
      if (!educationId) {
        return createApiResponse(400, null, 'Education ID is required');
      }

      const cosmosService = new CosmosDbService();
      const education = await cosmosService.getItem(educationId, 'education');
      
      if (!education) {
        return createNotFoundResponse('Education', educationId);
      }

      // Transform response
      const responseData = {
        id: education.id,
        ...education.data,
        createdAt: education.createdAt,
        updatedAt: education.updatedAt
      };

      return createApiResponse(200, responseData, 'Education retrieved successfully');

    } catch (error) {
      context.log.error('Error retrieving education:', error);
      return createServerErrorResponse(error);
    }
  }
});
