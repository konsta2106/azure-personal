const { app } = require('@azure/functions');
const CosmosDbService = require('../services/cosmosdb-service');
const { 
  createApiResponse, 
  createServerErrorResponse,
  sortSkillsByCategory
} = require('../utils/api-utils');

app.http('httpTriggerCvPublicGet', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'cv-public',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for GET public CV (no projects)');

    try {
      const cosmosService = new CosmosDbService();
      
      // Fetch all CV sections in parallel, excluding projects (intended for public webpage)
      const [
        generalInfoRecords,
        skills,
        experience,
        education,
        certifications,
        languages
      ] = await Promise.all([
        cosmosService.queryItems('generalInfo', {}),
        cosmosService.queryItems('skill', {}),
        cosmosService.queryItems('experience', {}),
        cosmosService.queryItems('education', {}),
        cosmosService.queryItems('certification', {}),
        cosmosService.queryItems('language', {})
      ]);

      // Transform general info (singleton)
      const generalInfo = generalInfoRecords.length > 0 
        ? {
            id: generalInfoRecords[0].id,
            ...generalInfoRecords[0].data,
            createdAt: generalInfoRecords[0].createdAt,
            updatedAt: generalInfoRecords[0].updatedAt
          }
        : null;

      // Transform and sort skills
      const sortedSkills = sortSkillsByCategory(skills);
      const transformedSkills = sortedSkills.map(skill => ({
        id: skill.id,
        ...skill.data,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt
      }));

      // Transform and sort experience by start date
      const sortedExperience = experience.sort((a, b) => 
        new Date(b.data.startDate) - new Date(a.data.startDate)
      );
      const transformedExperience = sortedExperience.map(exp => ({
        id: exp.id,
        ...exp.data,
        createdAt: exp.createdAt,
        updatedAt: exp.updatedAt
      }));

      // Transform and sort education by start date
      const sortedEducation = education.sort((a, b) => 
        new Date(b.data.startDate) - new Date(a.data.startDate)
      );
      const transformedEducation = sortedEducation.map(edu => ({
        id: edu.id,
        ...edu.data,
        createdAt: edu.createdAt,
        updatedAt: edu.updatedAt
      }));

      // Transform and sort certifications by issue date
      const sortedCertifications = certifications.sort((a, b) => 
        new Date(b.data.issueDate) - new Date(a.data.issueDate)
      );
      const transformedCertifications = sortedCertifications.map(cert => ({
        id: cert.id,
        ...cert.data,
        createdAt: cert.createdAt,
        updatedAt: cert.updatedAt
      }));

      // Transform and sort languages by proficiency
      const proficiencyOrder = { native: 0, fluent: 1, intermediate: 2, beginner: 3 };
      const sortedLanguages = languages.sort((a, b) => 
        proficiencyOrder[a.data.proficiency] - proficiencyOrder[b.data.proficiency]
      );
      const transformedLanguages = sortedLanguages.map(lang => ({
        id: lang.id,
        ...lang.data,
        createdAt: lang.createdAt,
        updatedAt: lang.updatedAt
      }));

      // Calculate metadata
      const skillCategories = [...new Set(transformedSkills.map(s => s.category))];
      
      // Calculate total years of experience
      const totalExperience = transformedExperience.reduce((total, exp) => {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        const years = (end - start) / (1000 * 60 * 60 * 24 * 365);
        return total + years;
      }, 0);

      // Find last updated timestamp across all entities (projects excluded)
      const allEntities = [
        ...generalInfoRecords,
        ...skills,
        ...experience,
        ...education,
        ...certifications,
        ...languages
      ];
      const lastUpdated = allEntities.length > 0
        ? allEntities.reduce((latest, entity) => {
            const entityDate = new Date(entity.updatedAt);
            return entityDate > latest ? entityDate : latest;
          }, new Date(allEntities[0].updatedAt))
        : new Date();

      // Build public CV object (no projects)
      const publicCV = {
        generalInfo,
        skills: transformedSkills,
        experience: transformedExperience,
        education: transformedEducation,
        certifications: transformedCertifications,
        languages: transformedLanguages,
        metadata: {
          lastUpdated: lastUpdated.toISOString(),
          version: '1.0.0',
          totalExperience: Math.round(totalExperience * 10) / 10, // Round to 1 decimal
          skillCategories: skillCategories.sort()
        }
      };

      return createApiResponse(200, publicCV, 'Public CV retrieved successfully');

    } catch (error) {
      context.log.error('Error retrieving public CV:', error);
      return createServerErrorResponse(error);
    }
  }
});
