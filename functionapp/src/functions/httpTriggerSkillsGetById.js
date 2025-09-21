const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createNotFoundResponse
} = require('../utils/api-utils');

app.http('httpTriggerSkillsGetById', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'skills/{skillId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for GET skills/{id}');

    try {
      const skillId = request.params.skillId;
      
      if (!skillId) {
        return createApiResponse(400, null, 'Skill ID is required');
      }

      const cosmosService = new CosmosDbService();
      const skill = await cosmosService.getItem(skillId, 'skill');
      
      if (!skill) {
        return createNotFoundResponse('Skill', skillId);
      }

      // Transform response
      const responseData = {
        id: skill.id,
        ...skill.data,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt
      };

      return createApiResponse(200, responseData, 'Skill retrieved successfully');

    } catch (error) {
      context.log.error('Error retrieving skill:', error);
      return createServerErrorResponse(error);
    }
  }
});