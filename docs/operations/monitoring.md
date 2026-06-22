# Monitoring

## Request IDs

Every backend response includes:

```txt
x-request-id: <uuid>
```

Clients can pass an existing `x-request-id`; otherwise the API generates one.

Use this value to connect browser errors, API responses, backend logs, and incident notes.

## Structured Logs

New operational logs use JSON through `services/logger.js`.

Sensitive fields are redacted, including:

- passwords
- tokens
- OTP values
- authorization headers
- cookies
- NID numbers
- API keys
- email passwords

## Suggested Dashboards

- API 5xx rate
- API p95 latency
- MongoDB connections and slow queries
- Worker dead jobs
- Checkout failure rate
- Mail failure count
- Pathao failed sync count
- Analytics event volume

## Error Monitoring

No Sentry or OpenTelemetry dependency is installed yet. If approved later:

- Capture request ID as a tag.
- Never send request bodies containing passwords, OTP, NID, tokens, or cookies.
- Sample high-volume public analytics routes.
