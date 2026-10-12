# Railway backend deployment

The backend uses the local `@scaleup/storefront-theme` package. Railway must
therefore build from the repository root instead of isolating
`ecommerce-backend/backend`.

## Backend API service

Configure the Railway backend API service as follows:

- Root Directory: repository root (`/`) or empty
- Builder: Dockerfile
- Dockerfile Path: `/ecommerce-backend/backend/Dockerfile`
- Config File Path: `/ecommerce-backend/backend/railway.json`
- Custom Build Command: empty
- Custom Start Command: empty
- Healthcheck Path: `/api/health`

Remove `RAILPACK_INSTALL_CMD` and any manually configured npm install command.
The Dockerfile runs `npm ci --omit=dev` from the backend directory and includes
the shared theme package before dependency installation.

Redeploy without the previous build cache after changing from Railpack to the
Dockerfile builder.

If the Railway UI still invokes Railpack, add this service variable:

```text
RAILWAY_DOCKERFILE_PATH=/ecommerce-backend/backend/Dockerfile
```

The build log must contain `Using detected Dockerfile`. If it still says
`railpack process exited`, the service is not reading the backend config or the
Dockerfile changes have not been pushed to the deployed Git branch.

## Worker service

The worker can use the same Dockerfile and repository-root configuration. Set
only its Custom Start Command to:

```bash
npm run worker
```

The Dockerfile runtime working directory is already
`/app/ecommerce-backend/backend`.

## Optional Redis cache

Set `REDIS_URL` in the backend API and worker service environments to the actual
connection URL for the same Redis service. Local development reads it from
`ecommerce-backend/backend/.env`. Do not put Redis credentials in Admin or storefront
public environment variables. The repository does not provision a Redis server.

An empty/missing value selects the backend's per-process memory cache. A configured
but unavailable Redis server produces cache misses; it does not start Redis or switch
to a separate local cache. The existing `/api/health` response does not check Redis.

Run this command inside each service's environment, from the backend directory:

```sh
npm run check:redis
```

Exit 0 confirms a successful connection and read-only PING/PONG check. Exit 1 means
Redis is unconfigured, unreachable, or incorrectly configured. The command does not
print the URL/credentials and does not write or delete cache entries. Restart the API
and workers after changing their environment variables. A local check does not prove
that a deployed process has the same configuration.
