#!/bin/bash
set -e
echo "🏥 Building HMS Portal..."

cd ~/Desktop/HMS

echo "→ Building frontend..."
npm run build

echo "→ Packaging with Electron..."
npx electron-builder --linux dir

echo "→ Copying backend dependencies..."
cp -r ~/Desktop/HMS/HMS-backend/node_modules \
      ~/Desktop/HMS/dist/linux-unpacked/resources/HMS-backend/

echo ""
echo "✅ Done! Launch with:"
echo "   ~/Desktop/HMS/dist/linux-unpacked/hms-portal --no-sandbox"
