const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse
} = require('../utils/api-utils');

app.http('httpTriggerCertificationsGet', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'certifications',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for GET certifications');

    try {
      const cosmosService = new CosmosDbService();
      
      // Get query parameters
      const url = new URL(request.url);
      const issuer = url.searchParams.get('issuer');
      const active = url.searchParams.get('active');
      
      // Build filters
      const filters = {};
      if (issuer) {
        filters.issuer = issuer;
      }

      // Query certifications from Cosmos DB
      let certifications = await cosmosService.queryItems('certification', filters);
      
      // Filter active certifications (not expired) if requested
      if (active === 'true') {
        const now = new Date();
        certifications = certifications.filter(cert => {
          if (!cert.data.expirationDate) return true; // No expiration = always active
          return new Date(cert.data.expirationDate) > now;
        });
      }
      
      // Sort by issue date (most recent first)
      const sortedCertifications = certifications.sort((a, b) => {
        return new Date(b.data.issueDate) - new Date(a.data.issueDate);
      });
      
      // Transform data - return only the data portion with id
      const transformedCertifications = sortedCertifications.map(cert => ({
        id: cert.id,
        ...cert.data,
        createdAt: cert.createdAt,
        updatedAt: cert.updatedAt
      }));

      return createApiResponse(200, transformedCertifications, 'Certifications retrieved successfully');

    } catch (error) {
      context.log.error('Error retrieving certifications:', error);
      return createServerErrorResponse(error);
    }
  }
});
