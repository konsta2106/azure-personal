const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createValidationErrorResponse,
  createBaseEntity,
  updateEntityData,
  validateRequiredFields
} = require('../utils/api-utils');

app.http('httpTriggerSkillsPut', {
  methods: ['PUT'],
  authLevel: 'function',
  route: 'skills/{skillId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for PUT skills/{skillId}');

    try {
      const skillId = request.params.skillId;
      
      // Parse request body - Azure Functions v4 way
      const body = await request.json();
      context.log('Parsed request body:', body);
      
      // Validate required fields
      const requiredFields = ['name', 'category', 'proficiencyLevel'];
      const missingFields = validateRequiredFields(body, requiredFields);
      
      if (missingFields.length > 0) {
        return createValidationErrorResponse(missingFields);
      }

      // Validate proficiencyLevel range
      if (body.proficiencyLevel < 1 || body.proficiencyLevel > 5) {
        return createApiResponse(400, null, 'Validation failed', {
          message: 'Proficiency level must be between 1 and 5'
        });
      }

      // Validate yearsOfExperience if provided
      if (body.yearsOfExperience !== undefined && body.yearsOfExperience < 0) {
        return createApiResponse(400, null, 'Validation failed', {
          message: 'Years of experience cannot be negative'
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

      // Prepare updated skill data
      const updatedSkillData = {
        name: body.name.trim(),
        category: body.category.trim(),
        proficiencyLevel: body.proficiencyLevel,
        yearsOfExperience: body.yearsOfExperience || 0,
        isHighlighted: body.isHighlighted || false,
        description: body.description ? body.description.trim() : ''
      };

      // Update the entity
      const updatedEntity = updateEntityData(existingSkill, updatedSkillData);

      // Save to database
      const result = await cosmosService.updateItem(skillId, 'skill', updatedEntity);

      // Return success response with the skill data
      return createApiResponse(200, {
        id: result.id,
        ...result.data,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      }, 'Skill updated successfully');

    } catch (error) {
      context.log.error('Error updating skill:', error);
      return createServerErrorResponse('Failed to update skill');
    }
  }
});
