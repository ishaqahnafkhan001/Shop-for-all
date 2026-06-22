# Backup And Restore

## MongoDB

Recommended minimum:

- Daily automated backup.
- 7 daily restore points.
- 4 weekly restore points.
- Monthly restore drill before major launches.

Restore drill:

1. Restore backup into a staging database.
2. Point staging API to the restored database.
3. Verify tenant login, products, orders, Store Builder theme, and checkout.
4. Verify no production secrets are copied into staging logs.

## Cloudinary

Cloudinary stores product media, store branding, banners, and NID documents.

- Keep account recovery and billing contacts up to date.
- Do not expose NID public URLs from app APIs.
- New NID uploads use authenticated delivery.
- Legacy NID URLs are migrated lazily on authorized document view.

## Environment Variables

- Store env values in the hosting provider secret manager.
- Keep a secure offline inventory of required variable names, not secret values.
- Rotate secrets after suspected exposure.
