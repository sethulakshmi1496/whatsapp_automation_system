#!/bin/bash

# Quick setup script to enable Tell Me API for testing

echo "=========================================="
echo "🧪 Tell Me API - Quick Test Setup"
echo "=========================================="
echo ""

# Update .env to enable API and use test server
echo "📝 Enabling Tell Me API in .env..."

# Backup current .env
cp .env .env.backup.$(date +%s)

# Update the configuration
sed -i '' 's/TELLME_API_ENABLED=false/TELLME_API_ENABLED=true/' .env
sed -i '' 's|TELLME_API_URL=https://api.example.com/customer/notify|TELLME_API_URL=http://localhost:4000/customer/notify|' .env
sed -i '' 's/TELLME_API_KEY=your_api_key_here/TELLME_API_KEY=test_key_123/' .env

echo "✅ Configuration updated!"
echo ""
echo "📋 Current settings:"
grep "TELLME_API" .env
echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Start test server in NEW terminal:"
echo "   cd backend"
echo "   node test-api-server.js"
echo ""
echo "2. Restart backend (in backend terminal):"
echo "   Press Ctrl+C"
echo "   npm start"
echo ""
echo "3. Watch backend logs:"
echo "   tail -f backend.log | grep TellMeAPI"
echo ""
echo "4. Send WhatsApp message from NEW number"
echo ""
echo "5. Check test server terminal for API call!"
echo ""
