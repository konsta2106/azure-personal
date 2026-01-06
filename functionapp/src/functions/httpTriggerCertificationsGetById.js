const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createNotFoundResponse
} = require('../utils/api-utils');

app.http('httpTriggerCertificationsGetById', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'certifications/{certificationId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for GET certifications/{id}');

    try {
      const certificationId = request.params.certificationId;
      
      if (!certificationId) {
        return createApiResponse(400, null, 'Certification ID is required');
      }

      const cosmosService = new CosmosDbService();
      const certification = await cosmosService.getItem(certificationId, 'certification');
      
      if (!certification) {
        return createNotFoundResponse('Certification', certificationId);
      }

      // Transform response
      const responseData = {
        id: certification.id,
        ...certification.data,
        createdAt: certification.createdAt,
        updatedAt: certification.updatedAt
      };

      return createApiResponse(200, responseData, 'Certification retrieved successfully');

    } catch (error) {
      context.log.error('Error retrieving certification:', error);
      return createServerErrorResponse(error);
    }
  }
});
