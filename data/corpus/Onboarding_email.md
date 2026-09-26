# Acme Widget API Onboarding Email

Subject: Welcome to the Acme Widget API — Getting Started

Welcome to the Acme Widget API. This email walks you through the steps to make your first authenticated request.

## Getting Started Steps

1. Register a client application in the Developer Portal.
2. Obtain your client_id.
3. Obtain your client_secret. Store it securely on your server and never place it in browser or mobile code.
4. Request an access token by sending your client_id and client_secret to /oauth2/token. The response is a JWT access token valid for 3600 seconds.
5. Include the token in the Authorization header on every request: Authorization: Bearer <token>.
6. Make a first test call, for example GET /v4/widgets?per_page=5.

## Before You Go to Production

Please review the following before deploying:

- Rate limits: OAuth2 clients are limited to 1000 requests per minute. Build in handling for HTTP 429 and the Retry-After header.
- Retries: use the recommended policy of 3 attempts with exponential backoff starting at 500 ms, plus up to 250 ms of jitter.
- Orders: send an Idempotency-Key header on POST /v4/orders so retries never create duplicate orders.
- Money and dates: prices are strings in USD, and timestamps are ISO 8601 in UTC.
- Versioning: build against /v4/ and watch for Sunset headers on responses.

## A Note on API Keys

New integrations should use OAuth2. API keys are deprecated and are supported only for legacy systems.

Regards,
Acme Developer Relations
