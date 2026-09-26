# Common Error Codes

Errors are returned as JSON objects with a numeric code field and a human-readable message field. The code is stable across versions; the message may change. Clients should switch on the code, not the message.

## Authentication and Authorization Errors (1xxx)

- 1001 Unauthorized: credentials are missing or invalid. Check that the Authorization: Bearer token (or X-Api-Key header) is present and that the OAuth2 token has not expired after its 3600-second lifetime.
- 1002 Forbidden: credentials are valid, but the resource is restricted. Retrying with the same credentials will not help.

## Request Errors (2xxx)

- 2001 Not Found: the requested resource does not exist, for example an unknown SKU on /v4/widgets/{sku}.
- 2002 Validation Error: the request body failed schema validation. Details are provided in an errors array. For example, a POST /v4/orders request without customer_id.

## Rate Limit Errors (3xxx)

- 3001 Rate Limit Exceeded: the client exceeded its per-minute rate limit. This accompanies an HTTP 429 response with X-RateLimit-Limit, X-RateLimit-Remaining, and Retry-After headers. See Rate Limits.

## Inventory Errors (4xxx)

The 4xxx range is reserved for inventory-specific conditions.

- 4001 Insufficient Stock: the requested quantity exceeds the available inventory at all warehouses.
- 4002 Warehouse Unavailable: the specified warehouse is in maintenance mode.

## Server Errors (5xxx)

- 5001 Internal Error: the server encountered an unexpected condition. Idempotent requests (GET, HEAD, PUT, DELETE) may be retried using the recommended retry policy. POST requests should only be retried with an Idempotency-Key.

## Which Errors Are Worth Retrying

- Retry with backoff: 3001 (after waiting for Retry-After) and 5001 (for idempotent requests, or POST with an Idempotency-Key).
- Do not retry unchanged: 1001, 1002, 2001, 2002, and 4001. These need the credentials, request, or order quantity to be corrected first.
- 4002: retry later, after the warehouse leaves maintenance mode.
