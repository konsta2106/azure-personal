const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createValidationErrorResponse,
  parseRequestBody,
  createBaseEntity,
  validateRequiredFields
} = require('../utils/api-utils');

app.http('httpTriggerSkillsPost', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'skills',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for POST skills');

    try {
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

      // Set defaults
      const skillData = {
        name: body.name.trim(),
        category: body.category.trim(),
        proficiencyLevel: body.proficiencyLevel,
        yearsOfExperience: body.yearsOfExperience || 0,
        isHighlighted: body.isHighlighted || false,
        description: body.description ? body.description.trim() : ''
      };

      // Create entity with base structure
      const entity = createBaseEntity('skill', 'konsta', skillData);
      
      // Save to Cosmos DB
      const cosmosService = new CosmosDbService();
      const createdSkill = await cosmosService.createItem(entity);

      // Transform response
      const responseData = {
        id: createdSkill.id,
        ...createdSkill.data,
        createdAt: createdSkill.createdAt,
        updatedAt: createdSkill.updatedAt
      };

      return createApiResponse(201, responseData, 'Skill created successfully');

    } catch (error) {
      context.log.error('Error creating skill:', error);
      
      if (error.message === 'Invalid JSON in request body') {
        return createApiResponse(400, null, 'Invalid JSON in request body');
      }
      
      return createServerErrorResponse(error);
    }
  }
});