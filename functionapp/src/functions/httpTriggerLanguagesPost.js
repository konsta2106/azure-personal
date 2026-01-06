const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createValidationErrorResponse,
  createBaseEntity,
  validateRequiredFields
} = require('../utils/api-utils');

app.http('httpTriggerLanguagesPost', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'languages',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for POST languages');

    try {
      // Parse request body - Azure Functions v4 way
      const body = await request.json();
      context.log('Parsed request body:', body);
      
      // Validate required fields
      const requiredFields = ['name', 'proficiency'];
      const missingFields = validateRequiredFields(body, requiredFields);
      
      if (missingFields.length > 0) {
        return createValidationErrorResponse(missingFields);
      }

      // Validate proficiency level
      const validProficiencies = ['native', 'fluent', 'intermediate', 'beginner'];
      if (!validProficiencies.includes(body.proficiency)) {
        return createApiResponse(400, null, 'Validation failed', {
          message: `Proficiency must be one of: ${validProficiencies.join(', ')}`
        });
      }

      // Set defaults and prepare data
      const languageData = {
        name: body.name.trim(),
        nativeName: body.nativeName ? body.nativeName.trim() : null,
        proficiency: body.proficiency,
        certifications: body.certifications || [],
        description: body.description ? body.description.trim() : ''
      };

      // Create entity with base structure
      const entity = createBaseEntity('language', 'konsta', languageData);
      
      // Save to Cosmos DB
      const cosmosService = new CosmosDbService();
      const createdLanguage = await cosmosService.createItem(entity);

      // Transform response
      const responseData = {
        id: createdLanguage.id,
        ...createdLanguage.data,
        createdAt: createdLanguage.createdAt,
        updatedAt: createdLanguage.updatedAt
      };

      return createApiResponse(201, responseData, 'Language created successfully');

    } catch (error) {
      context.log.error('Error creating language:', error);
      
      if (error.message === 'Invalid JSON in request body') {
        return createApiResponse(400, null, 'Invalid JSON in request body');
      }
      
      return createServerErrorResponse(error);
    }
  }
});
