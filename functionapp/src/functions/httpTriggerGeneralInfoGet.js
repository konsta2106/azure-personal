const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse
} = require('../utils/api-utils');

app.http('httpTriggerGeneralInfoGet', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'general-info',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for GET general-info');

    try {
      const cosmosService = new CosmosDbService();
      
      // Query for general info - should be only one per owner
      const generalInfoRecords = await cosmosService.queryItems('generalInfo', {});
      
      if (generalInfoRecords.length === 0) {
        return createApiResponse(404, null, 'General information not found', {
          message: 'No general information has been created yet'
        });
      }

      // Get the first (and should be only) record
      const generalInfo = generalInfoRecords[0];
      
      // Transform response
      const responseData = {
        id: generalInfo.id,
        ...generalInfo.data,
        createdAt: generalInfo.createdAt,
        updatedAt: generalInfo.updatedAt
      };

      return createApiResponse(200, responseData, 'General information retrieved successfully');

    } catch (error) {
      context.log.error('Error retrieving general information:', error);
      return createServerErrorResponse(error);
    }
  }
});
