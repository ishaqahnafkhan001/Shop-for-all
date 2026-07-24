# Railway backend deployment

The backend uses the local `@scaleup/storefront-theme` package. Railway must
therefore build from the repository root instead of isolating
`ecommerce-backend/backend`.

## Backend API service

Configure the Railway backend API service as follows:

- Root Directory: repository root (`/`) or empty
- Builder: Dockerfile
- Dockerfile Path: `/ecommerce-backend/backend/Dockerfile`
- Custom Build Command: empty
- Custom Start Command: empty
- Healthcheck Path: `/api/health`

Remove `RAILPACK_INSTALL_CMD` and any manually configured npm install command.
The Dockerfile runs `npm ci --omit=dev` from the backend directory and includes
the shared theme package before dependency installation.

Redeploy without the previous build cache after changing from Railpack to the
Dockerfile builder.

## Worker service

The worker can use the same Dockerfile and repository-root configuration. Set
only its Custom Start Command to:

```bash
npm run worker
```

The Dockerfile runtime working directory is already
`/app/ecommerce-backend/backend`.
