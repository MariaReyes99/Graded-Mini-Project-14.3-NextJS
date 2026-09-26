# Timeouts and Retries

## Request Timeouts

- Default request timeout: 30 seconds.
- Maximum request timeout: 60 seconds.

Clients can change the timeout for a request by setting the X-Request-Timeout header to a value between 1 and 60 (seconds).

Example: X-Request-Timeout: 45

Requests that exceed the timeout are aborted, and the API returns HTTP 504 Gateway Timeout.

## Which Requests Are Safe to Retry

Idempotent operations can be retried safely. These are GET, HEAD, PUT, and DELETE. Clients may safely retry them when they fail with a 5xx response or when they time out.

Non-idempotent operations, specifically POST (such as creating an order), are not automatically safe to retry, because a retry could create a duplicate.

## Idempotency-Key for POST Requests

For non-idempotent operations (POST), clients should send an Idempotency-Key header containing a unique value, such as a UUID generated for that operation.

Example: Idempotency-Key: 5f2b8c1e-7a3d-4e9b-b1c2-9d8e7f6a5b4c

The server deduplicates requests with the same Idempotency-Key within a 24-hour window. If a POST /v4/orders request times out and is retried with the same key, the order is created only once. Reuse the same key for retries of the same operation, and use a new key for each new operation.

## Recommended Retry Policy

- Attempts: 3
- Initial delay: 500 milliseconds
- Backoff: exponential, doubling each attempt
- Jitter: up to 250 milliseconds added to each delay

With this policy, the delays before retries are about 500 ms, then 1000 ms, then 2000 ms, each with up to 250 ms of random jitter added. Jitter spreads retries out so many clients do not retry at the same moment.

## Retries After Rate Limiting

For HTTP 429 responses, clients should honor the Retry-After header first, then apply exponential backoff with jitter (see Rate Limits).
