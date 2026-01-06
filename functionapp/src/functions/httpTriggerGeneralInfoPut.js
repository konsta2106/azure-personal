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

app.http('httpTriggerGeneralInfoPut', {
  methods: ['PUT'],
  authLevel: 'function',
  route: 'general-info',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for PUT general-info');

    try {
      // Parse request body - Azure Functions v4 way
      const body = await request.json();
      context.log('Parsed request body:', body);
      
      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'email'];
      const missingFields = validateRequiredFields(body, requiredFields);
      
      if (missingFields.length > 0) {
        return createValidationErrorResponse(missingFields);
      }

      // Validate email format (basic validation)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return createApiResponse(400, null, 'Validation failed', {
          message: 'Invalid email format'
        });
      }

      // Initialize Cosmos DB service
      const cosmosService = new CosmosDbService();
      await cosmosService.init();

      // Check if general info already exists
      const existingRecords = await cosmosService.queryItems('generalInfo', {});
      
      let result;
      
      if (existingRecords.length > 0) {
        // Update existing record
        const existingGeneralInfo = existingRecords[0];
        
        const updatedGeneralInfoData = {
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          title: body.title ? body.title.trim() : null,
          email: body.email.trim(),
          phone: body.phone ? body.phone.trim() : null,
          location: body.location || null,
          summary: body.summary ? body.summary.trim() : '',
          linkedIn: body.linkedIn || null,
          github: body.github || null,
          website: body.website || null,
          profileImage: body.profileImage || null
        };

        const updatedEntity = updateEntityData(existingGeneralInfo, updatedGeneralInfoData);
        result = await cosmosService.updateItem(existingGeneralInfo.id, 'generalInfo', updatedEntity);
        
      } else {
        // Create new record
        const generalInfoData = {
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          title: body.title ? body.title.trim() : null,
          email: body.email.trim(),
          phone: body.phone ? body.phone.trim() : null,
          location: body.location || null,
          summary: body.summary ? body.summary.trim() : '',
          linkedIn: body.linkedIn || null,
          github: body.github || null,
          website: body.website || null,
          profileImage: body.profileImage || null
        };

        // Use a fixed ID for general info to ensure singleton
        const entity = createBaseEntity('generalInfo', 'konsta', generalInfoData, 'general-info');
        result = await cosmosService.createItem(entity);
      }

      // Transform response
      const responseData = {
        id: result.id,
        ...result.data,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      };

      return createApiResponse(200, responseData, 'General information updated successfully');

    } catch (error) {
      context.log.error('Error updating general information:', error);
      
      if (error.message === 'Invalid JSON in request body') {
        return createApiResponse(400, null, 'Invalid JSON in request body');
      }
      
      return createServerErrorResponse(error);
    }
  }
});
