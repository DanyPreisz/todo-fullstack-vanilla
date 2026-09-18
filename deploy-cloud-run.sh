#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Definí PROJECT_ID}"
REGION="${REGION:-southamerica-east1}"
SERVICE="${SERVICE:-todo-vanilla}"
BUCKET="${BUCKET:-${PROJECT_ID}-todo-data}"
SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"

echo "Proyecto: $PROJECT_ID"
echo "Región:   $REGION"
echo "Servicio: $SERVICE"
echo "Bucket:   $BUCKET"

gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com storage.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com

if ! gcloud storage buckets describe "gs://$BUCKET" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://$BUCKET" --location="$REGION" --project="$PROJECT_ID"
fi

gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 1 \
  --concurrency 40 \
  --set-env-vars "DATA_DIR=/data,SQLITE_JOURNAL=DELETE,JWT_SECRET=${SECRET}" \
  --add-volume="name=data,type=cloud-storage,bucket=${BUCKET}" \
  --add-volume-mount="volume=data,mount-path=/data"

echo
echo "Listo. URL:"
gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)'
