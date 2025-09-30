const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse
} = require('../utils/api-utils');

app.http('httpTriggerProjectsDelete', {
  methods: ['DELETE'],
  authLevel: 'function',
  route: 'projects/{projectId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for DELETE projects/{projectId}');

    try {
      const projectId = request.params.projectId;
      
      if (!projectId) {
        return createApiResponse(400, null, 'Bad request', {
          message: 'Project ID is required'
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

      // Delete the project
      await cosmosService.deleteItem(projectId, 'project');

      // Return success response
      return createApiResponse(200, null, 'Project deleted successfully');

    } catch (error) {
      context.log.error('Error deleting project:', error);
      return createServerErrorResponse('Failed to delete project');
    }
  }
});