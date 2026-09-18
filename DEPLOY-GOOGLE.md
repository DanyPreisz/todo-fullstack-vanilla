# Subir a Google Cloud (Cloud Run)

La mejor opcion de Google para esta app es **Cloud Run**.

Repo: https://github.com/DanyPreisz/todo-fullstack-vanilla

## Desde este repositorio

1. [Cloud Run → Create service](https://console.cloud.google.com/run)
2. **Continuously deploy from a repository** / **Connect repo**
3. **Set up with Cloud Build** → autoriza GitHub → elegi `DanyPreisz/todo-fullstack-vanilla`
4. Branch: `^main$`
5. Build type: **Dockerfile**
6. Region: `southamerica-east1`
7. **Allow public access**
8. Create

Despues del primer deploy:

- `DATA_DIR=/data`
- `SQLITE_JOURNAL=DELETE`
- `JWT_SECRET=un-secreto-largo`
- Volume: bucket de Cloud Storage en `/data`
- Maximum instances = 1

## Deploy local con gcloud

```bash
export PROJECT_ID="tu-proyecto-gcp"
chmod +x deploy-cloud-run.sh
./deploy-cloud-run.sh
```
