const { app } = require('@azure/functions');
const cheerio = require('cheerio');
const {
  createApiResponse,
  createServerErrorResponse
} = require('../utils/api-utils');

/**
 * Attempts to extract the real destination URL from an email click-tracking URL.
 * Many trackers (e.g. technologyadvice.com) embed the destination as a URL-safe
 * base64 segment in the path, e.g. /click/{id}/{base64Url}/{hash}.
 *
 * @param {string} trackingUrl - The click-tracking URL from the email HTML.
 * @returns {string|null} The decoded destination URL, or null if none found.
 */
function extractRealUrl(trackingUrl) {
  try {
    const { pathname } = new URL(trackingUrl);
    const segments = pathname.split('/').filter(Boolean);

    // The destination is a base64-encoded URL; when decoded it starts with http.
    for (const segment of segments) {
      // URL-safe base64 of "http" starts with "aHR0".
      if (!segment.startsWith('aHR0')) {
        continue;
      }

      const decoded = Buffer.from(segment, 'base64').toString('utf8');

      if (/^https?:\/\//i.test(decoded)) {
        return decoded;
      }
    }
  } catch (error) {
    // Not a parseable URL - fall through and return null.
  }

  return null;
}

app.http('httpTriggerExtractNewsletterTopics', {
  methods: ['POST'],
  authLevel: 'function',
  handler: async (request, context) => {
    context.log('HTTP trigger function processed a request for POST extract-newsletter-topics');

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

        // Attempt to decode the real destination from the tracking URL.
        const realUrl = extractRealUrl(url);

        if (realUrl) {
          topics.push({
            title,
            url: realUrl,
            trackingUrl: url
          });
        } else {
          topics.push({
            title,
            url
          });
        }
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
