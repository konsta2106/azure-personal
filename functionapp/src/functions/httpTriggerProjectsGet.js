const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse
} = require('../utils/api-utils');

app.http('httpTriggerProjectsGet', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'projects',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for GET projects');

    try {
      const cosmosService = new CosmosDbService();
      
      // Get query parameters
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const highlighted = url.searchParams.get('highlighted');
      
      // Build filters
      const filters = {};
      if (status) {
        filters.status = status;
      }
      if (highlighted !== null && highlighted !== undefined) {
        filters.isHighlighted = highlighted === 'true';
      }

      // Query projects from Cosmos DB
      const projects = await cosmosService.queryItems('project', filters);
      
      // Sort by start date (most recent first)
      const sortedProjects = projects.sort((a, b) => {
        return new Date(b.data.startDate) - new Date(a.data.startDate);
      });
      
      // Transform data - return only the data portion with id
      const transformedProjects = sortedProjects.map(project => ({
        id: project.id,
        ...project.data,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }));

      return createApiResponse(200, transformedProjects, 'Projects retrieved successfully');

    } catch (error) {
      context.log.error('Error retrieving projects:', error);
      return createServerErrorResponse(error);
    }
  }
});