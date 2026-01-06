const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createValidationErrorResponse,
  createBaseEntity,
  validateRequiredFields
} = require('../utils/api-utils');

app.http('httpTriggerEducationPost', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'education',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for POST education');

    try {
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

      // Set defaults and prepare data
      const educationData = {
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

      // Create entity with base structure
      const entity = createBaseEntity('education', 'konsta', educationData);
      
      // Save to Cosmos DB
      const cosmosService = new CosmosDbService();
      const createdEducation = await cosmosService.createItem(entity);

      // Transform response
      const responseData = {
        id: createdEducation.id,
        ...createdEducation.data,
        createdAt: createdEducation.createdAt,
        updatedAt: createdEducation.updatedAt
      };

      return createApiResponse(201, responseData, 'Education created successfully');

    } catch (error) {
      context.log.error('Error creating education:', error);
      
      if (error.message === 'Invalid JSON in request body') {
        return createApiResponse(400, null, 'Invalid JSON in request body');
      }
      
      return createServerErrorResponse(error);
    }
  }
});
