# Rate Limits

OAuth2 Clients

1000 requests per minute

API Key Clients

200 requests per minute

Exceeded Limit Response

HTTP 429

Headers Returned:

- X-RateLimit-Limit
- X-RateLimit-Remaining
- Retry-After

Recommended Strategy:

Exponential backoff with jitter.