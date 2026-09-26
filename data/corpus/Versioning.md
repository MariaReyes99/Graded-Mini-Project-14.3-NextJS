# Versioning and Deprecation

## URL-Based Versioning

The API uses URL-based versioning. The version number is part of the path.

- Current version: v4
- URL format: /v4/ (for example /v4/widgets)
- Current specification release: 4.2 (May 2026)

## Earlier Versions

Earlier versions v1, v2, and v3 remain available, but they are in long-term maintenance. They receive only security patches. New features land exclusively in v4 and subsequent versions. Clients still on v1–v3 should plan a migration to v4.

## Deprecation Notices: Sunset and Link Headers

When a feature is scheduled for deprecation, the API responds with a Sunset header indicating the date after which the feature will be removed.

- Minimum notice period: 180 days between the Sunset announcement and removal.
- When a replacement exists, a Link header with the relation rel="successor" points to the recommended replacement.

Clients should log and alert on any response that includes a Sunset header.

## Breaking Change Policy

Breaking changes within a major version are not permitted. A client built against v4 will not be broken by later v4 releases.

The following are not considered breaking and may happen without notice:

- Adding new optional fields to responses.
- Adding new endpoints.
- Adding new optional query parameters.

Clients should therefore ignore unknown response fields rather than failing on them.
