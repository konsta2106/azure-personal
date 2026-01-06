const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createValidationErrorResponse,
  createBaseEntity,
  validateRequiredFields
} = require('../utils/api-utils');

app.http('httpTriggerCertificationsPost', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'certifications',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for POST certifications');

    try {
      // Parse request body - Azure Functions v4 way
      const body = await request.json();
      context.log('Parsed request body:', body);
      
      // Validate required fields
      const requiredFields = ['name', 'issuer', 'issueDate'];
      const missingFields = validateRequiredFields(body, requiredFields);
      
      if (missingFields.length > 0) {
        return createValidationErrorResponse(missingFields);
      }

      // Validate dates
      const issueDate = new Date(body.issueDate);
      if (isNaN(issueDate.getTime())) {
        return createApiResponse(400, null, 'Validation failed', {
          message: 'Invalid issue date format'
        });
      }

      if (body.expirationDate) {
        const expirationDate = new Date(body.expirationDate);
        if (isNaN(expirationDate.getTime())) {
          return createApiResponse(400, null, 'Validation failed', {
            message: 'Invalid expiration date format'
          });
        }
        if (expirationDate <= issueDate) {
          return createApiResponse(400, null, 'Validation failed', {
            message: 'Expiration date must be after issue date'
          });
        }
      }

      // Set defaults and prepare data
      const certificationData = {
        name: body.name.trim(),
        issuer: body.issuer.trim(),
        issueDate: body.issueDate,
        expirationDate: body.expirationDate || null,
        credentialId: body.credentialId ? body.credentialId.trim() : null,
        credentialUrl: body.credentialUrl || null,
        description: body.description ? body.description.trim() : '',
        skills: body.skills || [],
        logo: body.logo || null
      };

      // Create entity with base structure
      const entity = createBaseEntity('certification', 'konsta', certificationData);
      
      // Save to Cosmos DB
      const cosmosService = new CosmosDbService();
      const createdCertification = await cosmosService.createItem(entity);

      // Transform response
      const responseData = {
        id: createdCertification.id,
        ...createdCertification.data,
        createdAt: createdCertification.createdAt,
        updatedAt: createdCertification.updatedAt
      };

      return createApiResponse(201, responseData, 'Certification created successfully');

    } catch (error) {
      context.log.error('Error creating certification:', error);
      
      if (error.message === 'Invalid JSON in request body') {
        return createApiResponse(400, null, 'Invalid JSON in request body');
      }
      
      return createServerErrorResponse(error);
    }
  }
});
