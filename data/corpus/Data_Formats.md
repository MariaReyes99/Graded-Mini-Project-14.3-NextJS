# Data Formats

## JSON and Content Type

All request and response bodies use JSON.

- Requests with a body must specify Content-Type: application/json.
- Successful responses include Content-Type: application/json.
- Error responses also use application/json.

## Dates and Times

Date and time fields use the ISO 8601 format with an explicit UTC offset.

Example: 2026-05-01T14:30:00Z

The trailing Z means the time is in UTC. Clients should convert to local time only for display.

## Money Amounts

Money amounts are represented as strings, not numbers, to avoid floating-point precision issues.

Correct: "19.99"
Incorrect: 19.99

Clients should parse money strings with a decimal type rather than a floating-point type.

## Currency

The currency for all amounts is USD unless otherwise specified.

## Units of Measure

- Widget weight is in grams.
- Widget dimensions are in millimeters.

## Error Response Format

Error responses include a top-level error object with two fields:

- code: a numeric error code. The code is stable across API versions.
- message: a human-readable description. The message may change.

Example:

{
  "error": {
    "code": 2001,
    "message": "Widget not found"
  }
}

Clients should switch on the code, not the message. Validation errors (code 2002) include additional details in an errors array. See Error Codes for the full list.
