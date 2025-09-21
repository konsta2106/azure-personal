const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  sortSkillsByCategory 
} = require('../utils/api-utils');

app.http('httpTriggerSkillsGet', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'skills',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for GET skills');

    try {
      const cosmosService = new CosmosDbService();
      
      // Get query parameters
      const url = new URL(request.url);
      const category = url.searchParams.get('category');
      const highlighted = url.searchParams.get('highlighted');
      
      // Build filters
      const filters = {};
      if (category) {
        filters.category = category;
      }
      if (highlighted !== null && highlighted !== undefined) {
        filters.isHighlighted = highlighted === 'true';
      }

      // Query skills from Cosmos DB
      const skills = await cosmosService.queryItems('skill', filters);
      
      // Sort skills by category and proficiency
      const sortedSkills = sortSkillsByCategory(skills);
      
      // Transform data - return only the data portion with id
      const transformedSkills = sortedSkills.map(skill => ({
        id: skill.id,
        ...skill.data,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt
      }));

      return createApiResponse(200, transformedSkills, 'Skills retrieved successfully');

    } catch (error) {
      context.log.error('Error retrieving skills:', error);
      return createServerErrorResponse(error);
    }
  }
});