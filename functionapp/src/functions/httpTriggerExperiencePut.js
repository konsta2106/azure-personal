const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createValidationErrorResponse,
  updateEntityData,
  validateRequiredFields
} = require('../utils/api-utils');

app.http('httpTriggerExperiencePut', {
  methods: ['PUT'],
  authLevel: 'function',
  route: 'experience/{experienceId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for PUT experience/{experienceId}');

    try {
      const experienceId = request.params.experienceId;
      
      // Parse request body - Azure Functions v4 way
      const body = await request.json();
      context.log('Parsed request body:', body);
      
      // Validate required fields
      const requiredFields = ['company', 'position', 'startDate', 'employmentType'];
      const missingFields = validateRequiredFields(body, requiredFields);
      
      if (missingFields.length > 0) {
        return createValidationErrorResponse(missingFields);
      }

      // Validate employment type
      const validEmploymentTypes = ['full-time', 'part-time', 'contract', 'freelance'];
      if (!validEmploymentTypes.includes(body.employmentType)) {
        return createApiResponse(400, null, 'Validation failed', {
          message: `Employment type must be one of: ${validEmploymentTypes.join(', ')}`
        });
      }

      // Validate dates
      const startDate = new Date(body.startDate);
      if (isNaN(startDate.getTime())) {
        return createApiResponse(400, null, 'Validation failed', {
          message: 'Invalid start date format'
        });
      }

      if (body.endDate) {
        const endDate = new Date(body.endDate);
        if (isNaN(endDate.getTime())) {
          return createApiResponse(400, null, 'Validation failed', {
            message: 'Invalid end date format'
          });
        }
        if (endDate <= startDate) {
          return createApiResponse(400, null, 'Validation failed', {
            message: 'End date must be after start date'
          });
        }
      }

      // Initialize Cosmos DB service
      const cosmosService = new CosmosDbService();
      await cosmosService.init();

      // Check if experience exists
      const existingExperience = await cosmosService.getItem(experienceId, 'experience');
      if (!existingExperience) {
        return createApiResponse(404, null, 'Not found', {
          message: 'Experience not found'
        });
      }

      // Prepare updated experience data
      const updatedExperienceData = {
        company: body.company.trim(),
        position: body.position.trim(),
        location: body.location || null,
        startDate: body.startDate,
        endDate: body.endDate || null,
        isCurrentPosition: body.isCurrentPosition || false,
        employmentType: body.employmentType,
        description: body.description ? body.description.trim() : '',
        responsibilities: body.responsibilities || [],
        achievements: body.achievements || [],
        technologies: body.technologies || [],
        companyWebsite: body.companyWebsite || null,
        companyLogo: body.companyLogo || null
      };

      // Update the entity
      const updatedEntity = updateEntityData(existingExperience, updatedExperienceData);

      // Save to database
      const result = await cosmosService.updateItem(experienceId, 'experience', updatedEntity);

      // Return success response with the experience data
      return createApiResponse(200, {
        id: result.id,
        ...result.data,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      }, 'Experience updated successfully');

    } catch (error) {
      context.log.error('Error updating experience:', error);
      return createServerErrorResponse('Failed to update experience');
    }
  }
});