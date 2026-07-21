
#!/bin/bash

# ==========================================================
# BluePayload Cloud Run Deployment Script
# ==========================================================

# ---------- EDIT THESE ----------
PROJECT_ID="kupamanduk-scholarkm-project"
SERVICE_NAME="kupmanduk-flask-asia-east"
REGION="asia-east1"
# -------------------------------

echo "Setting project..."
gcloud config set project "$PROJECT_ID"

echo "Deploying Cloud Run service..."

gcloud run deploy "$SERVICE_NAME" \
    --source . \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --cpu 2 \
    --memory 4Gi \
    --concurrency 20 \
    --min-instances 0 \
    --max-instances 5 \
    --timeout 300 \
    --allow-unauthenticated

echo ""
echo "======================================="
echo "Deployment completed successfully."
echo "======================================="

#!/bin/bash

# ==========================================================
# BluePayload Cloud Run Deployment Script
# ==========================================================

# ---------- EDIT THESE ----------
PROJECT_ID="YOUR_PROJECT_ID"
SERVICE_NAME="bluepayload"
REGION="asia-south1"
# -------------------------------

echo "Setting project..."
gcloud config set project "$PROJECT_ID"

echo "Deploying Cloud Run service..."

gcloud run deploy "$SERVICE_NAME" \
    --source . \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --cpu 2 \
    --memory 4Gi \
    --concurrency 20 \
    --min-instances 0 \
    --max-instances 5 \
    --timeout 300 \
    --allow-unauthenticated

echo ""
echo "======================================="
echo "Deployment completed successfully."
echo "======================================="