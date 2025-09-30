const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createValidationErrorResponse,
  createBaseEntity,
  validateRequiredFields
} = require('../utils/api-utils');

app.http('httpTriggerProjectsPost', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'projects',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for POST projects');

    try {
      // Parse request body - Azure Functions v4 way
      const body = await request.json();
      context.log('Parsed request body:', body);
      
      // Validate required fields
      const requiredFields = ['name', 'description', 'startDate', 'status'];
      const missingFields = validateRequiredFields(body, requiredFields);
      
      if (missingFields.length > 0) {
        return createValidationErrorResponse(missingFields);
      }

      // Validate status
      const validStatuses = ['completed', 'ongoing', 'maintenance'];
      if (!validStatuses.includes(body.status)) {
        return createApiResponse(400, null, 'Validation failed', {
          message: `Status must be one of: ${validStatuses.join(', ')}`
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

      // Validate team size
      if (body.teamSize && body.teamSize < 1) {
        return createApiResponse(400, null, 'Validation failed', {
          message: 'Team size must be at least 1'
        });
      }

      // Set defaults and prepare data
      const projectData = {
        name: body.name.trim(),
        description: body.description.trim(),
        longDescription: body.longDescription ? body.longDescription.trim() : '',
        technologies: body.technologies || [],
        startDate: body.startDate,
        endDate: body.endDate || null,
        status: body.status,
        role: body.role ? body.role.trim() : '',
        teamSize: body.teamSize || 1,
        achievements: body.achievements || [],
        links: body.links || {},
        images: body.images || [],
        isHighlighted: body.isHighlighted || false
      };

      // Create entity with base structure
      const entity = createBaseEntity('project', 'konsta', projectData);
      
      // Save to Cosmos DB
      const cosmosService = new CosmosDbService();
      const createdProject = await cosmosService.createItem(entity);

      // Transform response
      const responseData = {
        id: createdProject.id,
        ...createdProject.data,
        createdAt: createdProject.createdAt,
        updatedAt: createdProject.updatedAt
      };

      return createApiResponse(201, responseData, 'Project created successfully');

    } catch (error) {
      context.log.error('Error creating project:', error);
      
      if (error.message === 'Invalid JSON in request body') {
        return createApiResponse(400, null, 'Invalid JSON in request body');
      }
      
      return createServerErrorResponse(error);
    }
  }
});