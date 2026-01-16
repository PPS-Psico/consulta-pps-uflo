#!/bin/bash

# deploy.sh - Script de despliegue automatizado

set -e  # Detener si hay errores

echo "🚀 Iniciando despliegue..."

# Variables de entorno
ENVIRONMENT=${1:-production}
VERSION=$(node -p "require('./package.json').version")
REGISTRY="your-registry.com"
IMAGE_NAME="consulta-pps-uflo"

echo "📦 Entorno: $ENVIRONMENT"
echo "🏷️  Versión: $VERSION"

# 1. Build y Test
echo "🔨 Construyendo aplicación..."
npm ci
npm run lint
npm run test
npm run build

# 2. Build Docker image
echo "🐳 Construyendo imagen Docker..."
docker build -t $REGISTRY/$IMAGE_NAME:$VERSION .
docker tag $REGISTRY/$IMAGE_NAME:$VERSION $REGISTRY/$IMAGE_NAME:latest

# 3. Push al registry
echo "📤 Subiendo al registry..."
docker push $REGISTRY/$IMAGE_NAME:$VERSION
docker push $REGISTRY/$IMAGE_NAME:latest

# 4. Deploy (dependiendo del entorno)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🌐 Desplegando a producción..."
    # Comandos para deploy a producción
    # kubectl apply -f k8s/production.yaml
elif [ "$ENVIRONMENT" = "staging" ]; then
    echo "🧪 Desplegando a staging..."
    # Comandos para deploy a staging
fi

echo "✅ Despliegue completado!"