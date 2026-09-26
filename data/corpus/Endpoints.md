# API Endpoints

## GET /v4/widgets

List widgets.

Supports:

- Pagination
- Category filters
- Tag filters
- Price filters
- Full text search

## GET /v4/widgets/{sku}

Retrieve widget detail.

## GET /v4/inventory/{sku}

Retrieve inventory by warehouse.

## POST /v4/orders

Create order.

Required:

- customer_id
- shipping_address
- line_items