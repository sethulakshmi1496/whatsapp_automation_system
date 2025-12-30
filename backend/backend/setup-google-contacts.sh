#!/bin/bash

# Google Contacts Configuration Setup Script

echo "=========================================="
echo "🔐 Google Contacts Configuration"
echo "=========================================="
echo ""

ENV_FILE=".env"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

# Google Cloud credentials
CLIENT_ID="335633419446-kh7i2q6pq17odo30o6b3se8ed5ru72vm.apps.googleusercontent.com"
CLIENT_SECRET="$1"  # Will be passed as argument

if [ -z "$CLIENT_SECRET" ]; then
    echo "❌ Error: Client Secret not provided!"
    echo ""
    echo "Usage: ./setup-google-contacts.sh YOUR_CLIENT_SECRET"
    echo ""
    echo "Example:"
    echo "  ./setup-google-contacts.sh GOCSPX-abc123xyz"
    echo ""
    exit 1
fi

# Check if configuration already exists
if grep -q "GOOGLE_CONTACTS_ENABLED" "$ENV_FILE"; then
    echo "⚠️  Google Contacts configuration already exists in .env"
    echo ""
    read -p "Do you want to update it? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled."
        exit 0
    fi
    
    # Remove existing configuration
    echo "🔄 Removing old configuration..."
    sed -i.bak '/# ========== Google Contacts Configuration ==========/,/GOOGLE_REDIRECT_URI=/d' "$ENV_FILE"
fi

# Add configuration to .env
echo "✅ Adding Google Contacts configuration to .env..."
cat >> "$ENV_FILE" << EOF

# ========== Google Contacts Configuration ==========
# Enable/disable Google Contacts integration
GOOGLE_CONTACTS_ENABLED=false

# Google OAuth 2.0 credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=${CLIENT_ID}
GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}

# OAuth redirect URI (must match Google Cloud Console)
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
EOF

echo ""
echo "=========================================="
echo "✅ Configuration Added Successfully!"
echo "=========================================="
echo ""
echo "📋 What was added to .env:"
echo "   GOOGLE_CONTACTS_ENABLED=false"
echo "   GOOGLE_CLIENT_ID=${CLIENT_ID}"
echo "   GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}"
echo "   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback"
echo ""
echo "🔒 Feature Status: DISABLED (safe mode)"
echo ""
echo "📝 Next Steps:"
echo "   1. Restart backend: npm start"
echo "   2. Connect your Google account: http://localhost:3000/auth/google"
echo "   3. Enable feature: Change GOOGLE_CONTACTS_ENABLED=true in .env"
echo "   4. Test by sending WhatsApp message from new number"
echo ""
echo "📚 Documentation: See GOOGLE_CONTACTS_SETUP.md"
echo ""
echo "✨ Setup complete!"
