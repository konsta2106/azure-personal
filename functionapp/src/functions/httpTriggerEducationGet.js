const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse
} = require('../utils/api-utils');

app.http('httpTriggerEducationGet', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'education',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for GET education');

    try {
      const cosmosService = new CosmosDbService();
      
      // Get query parameters
      const url = new URL(request.url);
      const ongoing = url.searchParams.get('ongoing');
      const institution = url.searchParams.get('institution');
      
      // Build filters
      const filters = {};
      if (ongoing !== null && ongoing !== undefined) {
        filters.isOngoing = ongoing === 'true';
      }
      if (institution) {
        filters.institution = institution;
      }

      // Query education from Cosmos DB
      const education = await cosmosService.queryItems('education', filters);
      
      // Sort by start date (most recent first)
      const sortedEducation = education.sort((a, b) => {
        return new Date(b.data.startDate) - new Date(a.data.startDate);
      });
      
      // Transform data - return only the data portion with id
      const transformedEducation = sortedEducation.map(edu => ({
        id: edu.id,
        ...edu.data,
        createdAt: edu.createdAt,
        updatedAt: edu.updatedAt
      }));

      return createApiResponse(200, transformedEducation, 'Education retrieved successfully');

    } catch (error) {
      context.log.error('Error retrieving education:', error);
      return createServerErrorResponse(error);
    }
  }
});
