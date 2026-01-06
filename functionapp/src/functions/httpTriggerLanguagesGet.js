const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse
} = require('../utils/api-utils');

app.http('httpTriggerLanguagesGet', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'languages',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for GET languages');

    try {
      const cosmosService = new CosmosDbService();
      
      // Get query parameters
      const url = new URL(request.url);
      const proficiency = url.searchParams.get('proficiency');
      
      // Build filters
      const filters = {};
      if (proficiency) {
        filters.proficiency = proficiency;
      }

      // Query languages from Cosmos DB
      const languages = await cosmosService.queryItems('language', filters);
      
      // Sort by proficiency (native > fluent > intermediate > beginner)
      const proficiencyOrder = { native: 0, fluent: 1, intermediate: 2, beginner: 3 };
      const sortedLanguages = languages.sort((a, b) => {
        return proficiencyOrder[a.data.proficiency] - proficiencyOrder[b.data.proficiency];
      });
      
      // Transform data - return only the data portion with id
      const transformedLanguages = sortedLanguages.map(lang => ({
        id: lang.id,
        ...lang.data,
        createdAt: lang.createdAt,
        updatedAt: lang.updatedAt
      }));

      return createApiResponse(200, transformedLanguages, 'Languages retrieved successfully');

    } catch (error) {
      context.log.error('Error retrieving languages:', error);
      return createServerErrorResponse(error);
    }
  }
});
