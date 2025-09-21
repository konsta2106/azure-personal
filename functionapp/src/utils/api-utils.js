const { v4: uuidv4 } = require('uuid');

/**
 * Utility functions for CV API
 */

// Generate UUID for new entities
function generateId() {
  return uuidv4();
}

// Get current timestamp
function getCurrentTimestamp() {
  return new Date().toISOString();
}

// Create base entity structure
function createBaseEntity(entityType, ownerId, data, id = null) {
  return {
    id: id || generateId(),
    entityType,
    ownerId,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    data
  };
}

// Update entity with new data
function updateEntityData(existingEntity, newData) {
  return {
    ...existingEntity,
    data: { ...existingEntity.data, ...newData },
    updatedAt: getCurrentTimestamp()
  };
}

// Validate required fields
function validateRequiredFields(data, requiredFields) {
  const missingFields = [];
  
  requiredFields.forEach(field => {
    if (field.includes('.')) {
      // Handle nested fields like 'data.name'
      const parts = field.split('.');
      let current = data;
      for (const part of parts) {
        if (!current || current[part] === undefined || current[part] === null) {
          missingFields.push(field);
          break;
        }
        current = current[part];
      }
    } else {
      if (!data[field] && data[field] !== 0 && data[field] !== false) {
        missingFields.push(field);
      }
    }
  });
  
  return missingFields;
}

// Create standardized API response
function createApiResponse(statusCode, data = null, message = null, errors = null) {
  const response = {
    status: statusCode,  // Changed from statusCode to status for Azure Functions v4
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    }
  };

  const body = {};
  
  if (data !== null) {
    body.data = data;
  }
  
  if (message) {
    body.message = message;
  }
  
  if (errors) {
    body.errors = errors;
  }

  // Add metadata for successful responses
  if (statusCode >= 200 && statusCode < 300) {
    body.success = true;
    body.timestamp = getCurrentTimestamp();
  } else {
    body.success = false;
    body.timestamp = getCurrentTimestamp();
  }

  response.jsonBody = body;  // Changed from body to jsonBody for Azure Functions v4
  return response;
}

// Error response helpers
function createErrorResponse(statusCode, message, errors = null) {
  return createApiResponse(statusCode, null, message, errors);
}

function createValidationErrorResponse(missingFields) {
  return createErrorResponse(400, 'Validation failed', {
    missingFields,
    message: `Missing required fields: ${missingFields.join(', ')}`
  });
}

function createNotFoundResponse(entityType, id) {
  return createErrorResponse(404, `${entityType} with id '${id}' not found`);
}

function createServerErrorResponse(error) {
  console.error('Server error:', error);
  return createErrorResponse(500, 'Internal server error', {
    message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
  });
}

// Parse request body safely
function parseRequestBody(request) {
  try {
    // In Azure Functions v4, the body can be accessed in different ways
    let body = request.body;
    
    // If body is a string, parse it as JSON
    if (typeof body === 'string') {
      return JSON.parse(body);
    }
    
    // If body is already an object, return it
    if (body && typeof body === 'object') {
      return body;
    }
    
    // If body is undefined or null, try to get it from the request
    if (!body) {
      // Try alternative ways to get the body
      if (request.json) {
        return request.json();
      }
      
      // Return empty object if no body found
      return {};
    }
    
    return body;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

// Get entity type display name
function getEntityDisplayName(entityType) {
  const displayNames = {
    'generalInfo': 'General Information',
    'skill': 'Skill',
    'project': 'Project',
    'experience': 'Work Experience',
    'education': 'Education',
    'certification': 'Certification',
    'language': 'Language'
  };
  return displayNames[entityType] || entityType;
}

// Sort functions for different entity types
function sortSkillsByCategory(skills) {
  return skills.sort((a, b) => {
    if (a.data.category !== b.data.category) {
      return a.data.category.localeCompare(b.data.category);
    }
    return b.data.proficiencyLevel - a.data.proficiencyLevel;
  });
}

module.exports = {
  generateId,
  getCurrentTimestamp,
  createBaseEntity,
  updateEntityData,
  validateRequiredFields,
  createApiResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createNotFoundResponse,
  createServerErrorResponse,
  parseRequestBody,
  getEntityDisplayName,
  sortSkillsByCategory
};