# Deployment Guide — Maison des Chefs

## Overview

This project uses GitHub Actions for CI/CD with Docker-based deployments.

## Repository Connection

- **GitHub Repo:** https://github.com/Fr0ddy79/maison-des-chefs
- **CI Pipeline:** Triggers on push to `master` and pull requests targeting `master`
- **Deploy Pipeline:** Triggers on push to `master` and version tags (`v*`)

## CI/CD Pipeline

### CI Workflow (ci.yml)
Runs on every push to `master` and every PR:
1. Checkout code
2. Setup Node.js 22
3. Install dependencies (`npm ci`)
4. TypeScript type check (`npm run build`)
5. Run tests (`npm test`)

### Deploy Workflow (deploy.yml)
Runs on push to `master` or version tags:
1. Build and push Docker image to GHCR
   - Tag: `ghcr.io/fr0ddy79/maison-des-chefs:latest`
   - Tag: `ghcr.io/fr0ddy79/maison-des-chefs:<sha>`
2. Echo deployment instructions (actual host deployment is external)

## Manual Deployment

### Build Docker Image
```bash
docker build -t ghcr.io/fr0ddy79/maison-des-chefs:latest ./maison-des-chefs
```

### Run with Docker Compose
```bash
docker-compose -f maison-des-chefs/docker-compose.yml up -d
```

### Pull Latest
```bash
docker pull ghcr.io/fr0ddy79/maison-des-chefs:latest
docker-compose -f maison-des-chefs/docker-compose.yml up -d
```

## Environment Variables

Required for deployment:
- `DATABASE_URL` — SQLite database path
- `JWT_SECRET` — Secret for JWT signing

See `.env.example` for the full list.

## Version Releases

To trigger a production deploy:
```bash
git tag v1.0.0
git push origin v1.0.0
```

This will push the Docker image with the version tag, which the deploy workflow picks up.