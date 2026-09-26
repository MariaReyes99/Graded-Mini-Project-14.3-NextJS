# API Endpoints

All endpoints in the current version are served under the /v4/ prefix. Request and response bodies use JSON. Every request must be authenticated (see Authentication).

## GET /v4/widgets — List Widgets

Returns the widget catalog. Listing supports pagination, filtering, and full-text search.

Pagination parameters:

- page: the page number to return.
- per_page: the number of widgets per page. The default page size is 25. The maximum is 100.

Filter parameters:

- category: filter by category, for example ?category=tools
- tag: filter by tag, for example ?tag=eco-friendly
- price_min: minimum price, for example ?price_min=10.00
- price_max: maximum price, for example ?price_max=50.00
- q: full-text search across widget name and description, for example ?q=hammer

Parameters can be combined. Example:

GET /v4/widgets?category=tools&price_min=10.00&price_max=50.00&per_page=50&page=2

## GET /v4/widgets/{sku} — Retrieve Widget Detail

Returns a single widget identified by its SKU.

The response includes the full widget object (SKU, name, description, weight in grams, dimensions in millimeters, stock count, and list price in USD) plus a links section. The links section points to related resources, including:

- the inventory endpoint for this widget
- the order history endpoint
- any applicable bundles

If no widget exists with the given SKU, the API returns error 2001 (not found).

## GET /v4/inventory/{sku} — Retrieve Inventory by Warehouse

Returns current stock levels for one widget, broken down by warehouse.

The response is a JSON object keyed by warehouse code, where each value is the current stock count at that location.

Important: a warehouse that has no inventory of the widget is omitted from the response. It is not included with a value of zero. Clients should treat a missing warehouse code as zero stock.

If a specified warehouse is in maintenance mode, the API may return error 4002 (warehouse unavailable).

## POST /v4/orders — Create Order

Places a new order.

Required fields in the request body:

- customer_id: the customer placing the order.
- shipping_address: where the order will be shipped.
- line_items: a list of items, each with a sku and a quantity.

Example request body:

{
  "customer_id": "cust_1042",
  "shipping_address": { ... },
  "line_items": [
    { "sku": "WID-001", "quantity": 2 },
    { "sku": "WID-017", "quantity": 1 }
  ]
}

The response includes:

- order_id: the assigned order identifier.
- total: the computed order total (a money string in USD).
- estimated ship date.
- a links section with the order status endpoint.

## Order Errors and Safe Retries

- If the request body fails schema validation (for example a missing customer_id), the API returns error 2002 (validation error) with details in an errors array.
- If a requested quantity exceeds available inventory across all warehouses, the API returns error 4001 (insufficient stock).

POST is not idempotent. To retry order creation safely, include an Idempotency-Key header with a unique value. The server deduplicates requests with the same key within a 24-hour window, so a retried order is not created twice (see Retries and Timeouts).
