const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createValidationErrorResponse,
  updateEntityData,
  validateRequiredFields
} = require('../utils/api-utils');

app.http('httpTriggerLanguagesPut', {
  methods: ['PUT'],
  authLevel: 'function',
  route: 'languages/{languageId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for PUT languages/{languageId}');

    try {
      const languageId = request.params.languageId;
      
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

      // Initialize Cosmos DB service
      const cosmosService = new CosmosDbService();
      await cosmosService.init();

      // Check if language exists
      const existingLanguage = await cosmosService.getItem(languageId, 'language');
      if (!existingLanguage) {
        return createApiResponse(404, null, 'Not found', {
          message: 'Language not found'
        });
      }

      // Prepare updated language data
      const updatedLanguageData = {
        name: body.name.trim(),
        nativeName: body.nativeName ? body.nativeName.trim() : null,
        proficiency: body.proficiency,
        certifications: body.certifications || [],
        description: body.description ? body.description.trim() : ''
      };

      // Update the entity
      const updatedEntity = updateEntityData(existingLanguage, updatedLanguageData);

      // Save to database
      const result = await cosmosService.updateItem(languageId, 'language', updatedEntity);

      // Return success response with the language data
      return createApiResponse(200, {
        id: result.id,
        ...result.data,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      }, 'Language updated successfully');

    } catch (error) {
      context.log.error('Error updating language:', error);
      return createServerErrorResponse('Failed to update language');
    }
  }
});
