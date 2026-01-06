const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createValidationErrorResponse,
  updateEntityData,
  validateRequiredFields
} = require('../utils/api-utils');

app.http('httpTriggerEducationPut', {
  methods: ['PUT'],
  authLevel: 'function',
  route: 'education/{educationId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for PUT education/{educationId}');

    try {
      const educationId = request.params.educationId;
      
      // Parse request body - Azure Functions v4 way
      const body = await request.json();
      context.log('Parsed request body:', body);
      
      // Validate required fields
      const requiredFields = ['institution', 'degree', 'fieldOfStudy', 'startDate'];
      const missingFields = validateRequiredFields(body, requiredFields);
      
      if (missingFields.length > 0) {
        return createValidationErrorResponse(missingFields);
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

      // Check if education exists
      const existingEducation = await cosmosService.getItem(educationId, 'education');
      if (!existingEducation) {
        return createApiResponse(404, null, 'Not found', {
          message: 'Education not found'
        });
      }

      // Prepare updated education data
      const updatedEducationData = {
        institution: body.institution.trim(),
        degree: body.degree.trim(),
        fieldOfStudy: body.fieldOfStudy.trim(),
        startDate: body.startDate,
        endDate: body.endDate || null,
        isOngoing: body.isOngoing || false,
        grade: body.grade ? body.grade.trim() : null,
        location: body.location || null,
        description: body.description ? body.description.trim() : '',
        relevantCoursework: body.relevantCoursework || [],
        achievements: body.achievements || [],
        thesis: body.thesis || null
      };

      // Update the entity
      const updatedEntity = updateEntityData(existingEducation, updatedEducationData);

      // Save to database
      const result = await cosmosService.updateItem(educationId, 'education', updatedEntity);

      // Return success response with the education data
      return createApiResponse(200, {
        id: result.id,
        ...result.data,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      }, 'Education updated successfully');

    } catch (error) {
      context.log.error('Error updating education:', error);
      return createServerErrorResponse('Failed to update education');
    }
  }
});
