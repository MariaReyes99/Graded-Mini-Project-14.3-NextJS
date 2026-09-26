# Acme Widget API Overview

Version: 4.2
Release Date: May 2026

The Acme Widget API is a RESTful service providing:

- Widget catalog access
- Inventory management
- Order management

All widgets contain:

- SKU
- Name
- Description
- Weight
- Dimensions
- Stock Count
- List Price

Authentication:

- OAuth2 (recommended)
- API Key (deprecated)

Base Endpoints:

- /v4/widgets
- /v4/inventory
- /v4/orders