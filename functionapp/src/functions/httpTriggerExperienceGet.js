const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse
} = require('../utils/api-utils');

app.http('httpTriggerExperienceGet', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'experience',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for GET experience');

    try {
      const cosmosService = new CosmosDbService();
      
      // Get query parameters
      const url = new URL(request.url);
      const current = url.searchParams.get('current');
      const company = url.searchParams.get('company');
      
      // Build filters
      const filters = {};
      if (current !== null && current !== undefined) {
        filters.isCurrentPosition = current === 'true';
      }
      if (company) {
        filters.company = company;
      }

      // Query experience from Cosmos DB
      const experience = await cosmosService.queryItems('experience', filters);
      
      // Sort by start date (most recent first)
      const sortedExperience = experience.sort((a, b) => {
        return new Date(b.data.startDate) - new Date(a.data.startDate);
      });
      
      // Transform data - return only the data portion with id
      const transformedExperience = sortedExperience.map(exp => ({
        id: exp.id,
        ...exp.data,
        createdAt: exp.createdAt,
        updatedAt: exp.updatedAt
      }));

      return createApiResponse(200, transformedExperience, 'Experience retrieved successfully');

    } catch (error) {
      context.log.error('Error retrieving experience:', error);
      return createServerErrorResponse(error);
    }
  }
});