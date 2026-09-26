# Acme Widget API Overview

Version: 4.2
Release Date: May 2026
Publisher: Acme Engineering

The Acme Widget API is a RESTful service that exposes widget catalog data, inventory levels, and order management to authorized clients. This overview summarizes the protocol contract, authentication mechanisms, rate limits, data formats, and operational guarantees for version 4.2 of the API. Each topic is covered in more detail in its own document.

## What the API Provides

The API has three functional areas:

- Widget catalog access: list, search, filter, and retrieve widgets.
- Inventory management: check current stock levels for a widget across warehouses.
- Order management: place orders for one or more widgets.

## The Widget Data Model

Acme Widget products are physical inventory items identified by a stable SKU. The SKU does not change over the life of a product, so it is safe to store and use as a key in client systems.

Each widget has the following attributes:

- SKU: the stable product identifier.
- Name: the product name.
- Description: a longer text description, searchable through full-text search.
- Weight: measured in grams.
- Dimensions: measured in millimeters.
- Stock count: the current stock across configured warehouses.
- List price: in USD, represented as a string (for example "19.99").

Widgets are grouped into categories and may carry one or more tags. Categories and tags are used for search and filtering on the catalog endpoint.

## Authentication at a Glance

- OAuth2 with the client_credentials grant: recommended for all new server-to-server integrations.
- API keys: supported for legacy integrations only and deprecated. New clients should not adopt API key authentication.

## Base Endpoints

All current endpoints live under the /v4/ URL prefix:

- /v4/widgets: widget catalog listing and search.
- /v4/widgets/{sku}: a single widget's details.
- /v4/inventory/{sku}: stock levels by warehouse.
- /v4/orders: order creation.

## Where to Find More Detail

- Authentication: token requests, headers, and API key scoping.
- Endpoints: parameters, filters, pagination, and response contents.
- Rate Limits: per-client limits and handling HTTP 429.
- Data Formats: JSON, dates, money, and error bodies.
- Retries and Timeouts: timeout headers, idempotency, and the retry policy.
- Error Codes: the numeric error code catalog.
- Versioning: URL versioning, deprecation notices, and breaking-change policy.
