# FAQ

## Authentication Questions

Q: Which authentication method should a new integration use?
A: OAuth2 with the client_credentials grant. API keys are deprecated and should not be adopted by new clients.

Q: How long is an OAuth2 access token valid?
A: 3600 seconds (one hour). Request a new token from /oauth2/token when it expires.

Q: Where do I send the OAuth2 token?
A: In the Authorization header as a Bearer token: Authorization: Bearer <token>.

Q: Can I still use API keys?
A: Yes, for legacy integrations, but they are deprecated. They use the X-Api-Key header and are scoped to either sandbox or production.

Q: Do API keys expire?
A: No, API keys do not expire automatically. They can be rotated at any time through the Developer Portal.

## Rate Limit Questions

Q: What are the rate limits?
A: 1000 requests per minute for OAuth2 clients and 200 requests per minute for API key clients, both evaluated as a sliding window.

Q: What happens when I exceed a rate limit?
A: The API returns HTTP 429 Too Many Requests with error code 3001 and the headers X-RateLimit-Limit, X-RateLimit-Remaining, and Retry-After.

Q: What if my client ignores Retry-After?
A: Clients that repeatedly ignore Retry-After headers may be temporarily suspended.

## Catalog and Order Questions

Q: What is the maximum page size when listing widgets?
A: 100. The default page size is 25, controlled by the per_page parameter.

Q: How do I search for widgets?
A: Use the q parameter on /v4/widgets for full-text search across name and description, for example ?q=hammer.

Q: Why is a warehouse missing from the inventory response?
A: Warehouses with no stock for that widget are omitted rather than returned with zero.

Q: How do I avoid creating duplicate orders on retry?
A: Send an Idempotency-Key header on POST /v4/orders. The server deduplicates requests with the same key within 24 hours.

## Data and Operations Questions

Q: What currency is supported?
A: USD, unless otherwise specified.

Q: Why are prices strings instead of numbers?
A: To avoid floating-point precision issues, for example "19.99".

Q: What content type should requests use?
A: application/json.

Q: What is the request timeout?
A: 30 seconds by default, extendable to 60 seconds with the X-Request-Timeout header.

Q: How much notice is given before a feature is removed?
A: At least 180 days, announced through the Sunset header.
