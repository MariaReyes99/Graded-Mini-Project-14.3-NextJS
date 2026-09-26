# Rate Limits

The Acme Widget API enforces per-client rate limits. Limits depend on the authentication method and are evaluated as a sliding window.

## Limits by Authentication Method

- OAuth2 clients: 1000 requests per minute (sliding window). This is the default rate limit.
- API key clients: 200 requests per minute (sliding window).

API key authentication is rate-limited more aggressively than OAuth2. Migrating from API keys to OAuth2 increases a client's limit fivefold, from 200 to 1000 requests per minute.

## How the Sliding Window Works

A sliding window counts requests made in the most recent 60 seconds, continuously, rather than resetting at the start of each clock minute. This means a burst of requests is counted against the limit for a full minute after it happens.

## Exceeding the Limit: HTTP 429

When a client exceeds its rate limit, the API returns HTTP 429 Too Many Requests. The error body uses error code 3001 (rate limit exceeded).

The 429 response includes three headers:

- X-RateLimit-Limit: the ceiling value, meaning the maximum number of requests allowed in the window.
- X-RateLimit-Remaining: the number of requests still permitted in the current window.
- Retry-After: the number of seconds the client should wait before retrying.

## Handling a 429 Response

Recommended client behavior:

1. Stop sending requests and read the Retry-After header.
2. Wait at least the number of seconds given in Retry-After.
3. Retry using exponential backoff with jitter, so many clients do not retry at the same moment.
4. Monitor X-RateLimit-Remaining during normal operation and slow down before reaching zero.

## Suspension for Ignoring Retry-After

Clients that repeatedly ignore Retry-After headers may be subject to temporary suspension. Respecting Retry-After is required, not optional.
