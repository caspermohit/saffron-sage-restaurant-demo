#!/usr/bin/env bash
set -euo pipefail
: "${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID}"
: "${AWS_REGION:?Set AWS_REGION}"
: "${IMAGE_TAG:?Set an immutable release tag, e.g. git SHA}"
: "${API_INTERNAL_URL:?Set reachable API URL, e.g. http://localhost:8080 for a shared ECS task}"
registry="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$registry"
for service in frontend backend; do
  tag="$registry/saffron-$service:$IMAGE_TAG"
  if [ "$service" = frontend ]; then
    docker buildx build --platform linux/amd64 --build-arg "API_INTERNAL_URL=$API_INTERNAL_URL" --tag "$tag" --push ./frontend
  else
    docker buildx build --platform linux/amd64 --tag "$tag" --push ./backend
  fi
done
