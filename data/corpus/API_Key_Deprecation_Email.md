# API Key Authentication Deprecation Notice

Subject: API Key Authentication Deprecation Notice

Team,

API key authentication for the Acme Widget API is deprecated. All new integrations must use OAuth2 with the client_credentials grant.

## What Is Changing

- API keys remain supported for existing legacy systems.
- API keys are no longer recommended for new development, and new clients should not adopt them.
- Any future removal of API key support will follow the standard deprecation policy: a Sunset header with at least 180 days of notice.

## Why Migrate to OAuth2

- Short-lived tokens: OAuth2 access tokens expire after 3600 seconds, whereas API keys do not expire automatically. A leaked token is only useful for a short time.
- Improved security: client secrets stay on the server, and tokens are refreshed regularly.
- Higher rate limits: OAuth2 clients get 1000 requests per minute, compared with 200 requests per minute for API key clients.

## How to Migrate

1. Register a client in the Developer Portal and obtain a client_id and client_secret.
2. Request an access token from /oauth2/token.
3. Replace the X-Api-Key header with Authorization: Bearer <token>.
4. Add logic to request a new token before the 3600-second lifetime ends.
5. Once OAuth2 traffic is confirmed, rotate or retire the old API key in the Developer Portal.

Regards,
Platform Engineering
