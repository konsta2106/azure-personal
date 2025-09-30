const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createValidationErrorResponse,
  updateEntityData,
  validateRequiredFields
} = require('../utils/api-utils');

app.http('httpTriggerProjectsPut', {
  methods: ['PUT'],
  authLevel: 'function',
  route: 'projects/{projectId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for PUT projects/{projectId}');

    try {
      const projectId = request.params.projectId;
      
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

      // Initialize Cosmos DB service
      const cosmosService = new CosmosDbService();
      await cosmosService.init();

      // Check if project exists
      const existingProject = await cosmosService.getItem(projectId, 'project');
      if (!existingProject) {
        return createApiResponse(404, null, 'Not found', {
          message: 'Project not found'
        });
      }

      // Prepare updated project data
      const updatedProjectData = {
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

      // Update the entity
      const updatedEntity = updateEntityData(existingProject, updatedProjectData);

      // Save to database
      const result = await cosmosService.updateItem(projectId, 'project', updatedEntity);

      // Return success response with the project data
      return createApiResponse(200, {
        id: result.id,
        ...result.data,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      }, 'Project updated successfully');

    } catch (error) {
      context.log.error('Error updating project:', error);
      return createServerErrorResponse('Failed to update project');
    }
  }
});