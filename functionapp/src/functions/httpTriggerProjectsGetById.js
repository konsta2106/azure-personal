const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createNotFoundResponse
} = require('../utils/api-utils');

app.http('httpTriggerProjectsGetById', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'projects/{projectId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for GET projects/{id}');

    try {
      const projectId = request.params.projectId;
      
      if (!projectId) {
        return createApiResponse(400, null, 'Project ID is required');
      }

      const cosmosService = new CosmosDbService();
      const project = await cosmosService.getItem(projectId, 'project');
      
      if (!project) {
        return createNotFoundResponse('Project', projectId);
      }

      // Transform response
      const responseData = {
        id: project.id,
        ...project.data,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      };

      return createApiResponse(200, responseData, 'Project retrieved successfully');

    } catch (error) {
      context.log.error('Error retrieving project:', error);
      return createServerErrorResponse(error);
    }
  }
});