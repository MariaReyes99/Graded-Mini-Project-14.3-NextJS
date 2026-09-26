# Authentication

Supported methods:

## OAuth2

Recommended Authentication

Token Endpoint:

/oauth2/token

Requirements:

- client_id
- client_secret

Returns:

JWT bearer token

Token Lifetime:

3600 seconds

Headers:

Authorization: Bearer <token>

## API Keys

Deprecated

Header:

X-Api-Key

Environment Scoped:

- Sandbox
- Production

API Keys can be rotated via Developer Portal.