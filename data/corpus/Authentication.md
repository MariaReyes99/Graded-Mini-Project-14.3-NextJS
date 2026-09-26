# Authentication

The Acme Widget API supports two authentication methods: OAuth2 and API keys. OAuth2 with the client_credentials grant type is the recommended method for server-to-server integrations. API keys are supported only for legacy integrations and are deprecated; new clients should not adopt API key authentication.

## OAuth2 (Recommended)

OAuth2 uses the client_credentials grant type, which is designed for server-to-server communication where no end user is involved.

To obtain an access token, the client sends a request to the token endpoint and presents its client_id and client_secret pair.

Token endpoint: /oauth2/token

Required credentials:

- client_id
- client_secret

The endpoint returns a JWT (JSON Web Token) access token. The token is valid for 3600 seconds (one hour). After it expires, the client must request a new token from /oauth2/token.

## Using the OAuth2 Access Token

The access token must be presented on every subsequent API request in the Authorization header, using the Bearer scheme:

Authorization: Bearer <access_token>

Example request:

GET /v4/widgets
Authorization: Bearer eyJhbGciOi...

Best practices for OAuth2 clients:

- Cache the access token and reuse it until it is close to expiry, rather than requesting a new token for every call.
- Refresh the token shortly before the 3600-second lifetime ends to avoid failed requests.
- Store the client_secret securely on the server. Never expose it in browser or mobile client code.

## API Keys (Deprecated)

API keys are issued through the Developer Portal. They are supported for legacy integrations but are deprecated and should not be used for new development.

API keys must be presented in the X-Api-Key header:

X-Api-Key: <your_api_key>

Each API key is scoped to a single environment:

- Sandbox
- Production

A sandbox key will not work against production, and a production key will not work against sandbox.

## API Key Expiry and Rotation

API keys do not expire automatically. They remain valid until they are rotated. Keys can be rotated at any time through the Developer Portal. Rotating a key regularly, and immediately if it may have been exposed, is recommended.

## OAuth2 vs API Keys

- Recommendation: OAuth2 is recommended; API keys are deprecated.
- Credential lifetime: OAuth2 tokens expire after 3600 seconds; API keys do not expire automatically.
- Header: OAuth2 uses Authorization: Bearer <token>; API keys use X-Api-Key.
- Rate limits: API key authentication is rate-limited more aggressively. OAuth2 clients get 1000 requests per minute; API key clients get 200 requests per minute.
- Environment scoping: API keys are scoped to a single environment (sandbox or production).

## Authentication Errors

- Error 1001 (unauthorized): credentials are missing or invalid, for example an expired OAuth2 token or a wrong API key.
- Error 1002 (forbidden): credentials are valid, but the requested resource is restricted.
