const { app } = require('@azure/functions');
const cheerio = require('cheerio');
const {
  createApiResponse,
  createServerErrorResponse
} = require('../utils/api-utils');

app.http('httpTriggerExtractNewsletterTopics', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'newsletter/extract-topics',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for POST newsletter/extract-topics');

    try {
      // Parse request body - Azure Functions v4 way
      const body = await request.json();
      const html = body.html;

      if (!html) {
        return createApiResponse(400, null, "Missing 'html' in request body");
      }

      const $ = cheerio.load(html);

      const topics = [];
      const seenUrls = new Set();

      $('h1 a[href]').each((_, element) => {
        const title = $(element)
          .text()
          .replace(/\s+/g, ' ')
          .trim();

        const url = $(element).attr('href');

        if (!title || !url) {
          return;
        }

        // Remove duplicate links
        if (seenUrls.has(url)) {
          return;
        }

        seenUrls.add(url);

        topics.push({
          title,
          url
        });
      });

      return createApiResponse(200, { topics }, 'Topics extracted successfully');

    } catch (error) {
      context.log.error('Failed to parse newsletter:', error);

      if (error.message === 'Invalid JSON in request body') {
        return createApiResponse(400, null, 'Invalid JSON in request body');
      }

      return createServerErrorResponse(error);
    }
  }
});
