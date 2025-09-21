const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse
} = require('../utils/api-utils');

app.http('httpTriggerSkillsDelete', {
  methods: ['DELETE'],
  authLevel: 'function',
  route: 'skills/{skillId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for DELETE skills/{skillId}');

    try {
      const skillId = request.params.skillId;
      
      if (!skillId) {
        return createApiResponse(400, null, 'Bad request', {
          message: 'Skill ID is required'
        });
      }

      // Initialize Cosmos DB service
      const cosmosService = new CosmosDbService();
      await cosmosService.init();

      // Check if skill exists
      const existingSkill = await cosmosService.getItem(skillId, 'skill');
      if (!existingSkill) {
        return createApiResponse(404, null, 'Not found', {
          message: 'Skill not found'
        });
      }

      // Delete the skill
      await cosmosService.deleteItem(skillId, 'skill');

      // Return success response
      return createApiResponse(200, null, 'Skill deleted successfully');

    } catch (error) {
      context.log.error('Error deleting skill:', error);
      return createServerErrorResponse('Failed to delete skill');
    }
  }
});
