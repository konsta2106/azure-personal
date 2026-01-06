const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  createValidationErrorResponse,
  updateEntityData,
  validateRequiredFields
} = require('../utils/api-utils');

app.http('httpTriggerCertificationsPut', {
  methods: ['PUT'],
  authLevel: 'function',
  route: 'certifications/{certificationId}',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for PUT certifications/{certificationId}');

    try {
      const certificationId = request.params.certificationId;
      
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

      // Initialize Cosmos DB service
      const cosmosService = new CosmosDbService();
      await cosmosService.init();

      // Check if certification exists
      const existingCertification = await cosmosService.getItem(certificationId, 'certification');
      if (!existingCertification) {
        return createApiResponse(404, null, 'Not found', {
          message: 'Certification not found'
        });
      }

      // Prepare updated certification data
      const updatedCertificationData = {
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

      // Update the entity
      const updatedEntity = updateEntityData(existingCertification, updatedCertificationData);

      // Save to database
      const result = await cosmosService.updateItem(certificationId, 'certification', updatedEntity);

      // Return success response with the certification data
      return createApiResponse(200, {
        id: result.id,
        ...result.data,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      }, 'Certification updated successfully');

    } catch (error) {
      context.log.error('Error updating certification:', error);
      return createServerErrorResponse('Failed to update certification');
    }
  }
});
