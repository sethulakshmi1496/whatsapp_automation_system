#!/bin/bash

# Tell Me API Configuration Setup Script
# This script adds the Tell Me API configuration to your .env file

ENV_FILE=".env"

echo "=========================================="
echo "Tell Me API Configuration Setup"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

# Check if configuration already exists
if grep -q "TELLME_API_ENABLED" "$ENV_FILE"; then
    echo "⚠️  Tell Me API configuration already exists in .env"
    echo ""
    read -p "Do you want to update it? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 0
    fi
    
    # Remove existing configuration
    echo "🔄 Removing old configuration..."
    sed -i.bak '/# ========== Tell Me API Configuration ==========/,/TELLME_API_RETRY_ATTEMPTS=/d' "$ENV_FILE"
fi

# Add configuration to .env
echo "✅ Adding Tell Me API configuration to .env..."
cat >> "$ENV_FILE" << 'EOF'

# ========== Tell Me API Configuration ==========
# Enable/disable Tell Me API integration
TELLME_API_ENABLED=false

# API endpoint URL (must use HTTPS in production)
TELLME_API_URL=https://api.example.com/customer/notify

# API authentication key
TELLME_API_KEY=your_api_key_here

# Request timeout in milliseconds (default: 5000)
TELLME_API_TIMEOUT=5000

# Number of retry attempts on failure (default: 2)
TELLME_API_RETRY_ATTEMPTS=2
EOF

echo ""
echo "=========================================="
echo "✅ Configuration Added Successfully!"
echo "=========================================="
echo ""
echo "📋 What was added to .env:"
echo "   TELLME_API_ENABLED=false"
echo "   TELLME_API_URL=https://api.example.com/customer/notify"
echo "   TELLME_API_KEY=your_api_key_here"
echo "   TELLME_API_TIMEOUT=5000"
echo "   TELLME_API_RETRY_ATTEMPTS=2"
echo ""
echo "🔒 Feature Status: DISABLED (safe mode)"
echo ""
echo "📝 Next Steps:"
echo "   1. The feature is installed but DISABLED"
echo "   2. To test: node test-api-server.js"
echo "   3. To enable: Change TELLME_API_ENABLED=true in .env"
echo "   4. Restart backend: npm start"
echo ""
echo "📚 Documentation: See TELLME_API_README.md"
echo ""
echo "✨ Setup complete!"
