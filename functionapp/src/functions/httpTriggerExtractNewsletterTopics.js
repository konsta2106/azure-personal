const { app } = require('@azure/functions');
const cheerio = require('cheerio');
const crypto = require('crypto');
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

/**
 * Normalizes a URL to a canonical form so that minor variations of the same
 * destination produce the same value (and therefore the same hash / DB key).
 * Strips query strings, fragments, and trailing slashes.
 *
 * @param {string} url - The URL to canonicalize.
 * @returns {string} The canonical URL.
 */
function canonicalizeUrl(url) {
  return url
    .trim()
    .split('#')[0]
    .split('?')[0]
    .replace(/\/$/, '');
}

/**
 * Generates a deterministic SHA-256 hash of a URL, suitable for use as a
 * unique key in the database. The same URL always produces the same hash.
 *
 * @param {string} url - The URL to hash.
 * @returns {string} A hex-encoded SHA-256 hash of the URL.
 */
function hashUrl(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
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
      const seenHashes = new Set();

      $('h1 a[href]').each((_, element) => {
        const title = $(element)
          .text()
          .replace(/\s+/g, ' ')
          .trim();

        const url = $(element).attr('href');

        if (!title || !url) {
          return;
        }

        // Attempt to decode the real destination from the tracking URL.
        const realUrl = extractRealUrl(url);
        const canonicalUrl = canonicalizeUrl(realUrl || url);
        const urlHash = hashUrl(canonicalUrl);

        // Remove duplicate destinations (even across different tracking wrappers).
        if (seenHashes.has(urlHash)) {
          return;
        }

        seenHashes.add(urlHash);

        if (realUrl) {
          topics.push({
            title,
            url: canonicalUrl,
            trackingUrl: url,
            urlHash
          });
        } else {
          topics.push({
            title,
            url: canonicalUrl,
            urlHash
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
