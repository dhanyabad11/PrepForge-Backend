#!/bin/bash

echo "🔧 PrepForge Database Setup"
echo "=========================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = "postgresql://username:password@localhost:5432/prepforge?schema=public" ]; then
    echo "⚠️  Database URL not configured!"
    echo ""
    echo "Please set up your database connection:"
    echo "1. For local PostgreSQL:"
    echo "   DATABASE_URL=\"postgresql://username:password@localhost:5432/prepforge?schema=public\""
    echo ""
    echo "2. For cloud services:"
    echo "   - Supabase: https://supabase.com/"
    echo "   - Railway: https://railway.app/"
    echo "   - Neon: https://neon.tech/"
    echo ""
    echo "Update the DATABASE_URL in your .env file and run this script again."
    exit 1
fi

echo "🗄️  Database URL configured: ${DATABASE_URL%%\?*}..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Push database schema (for development)
echo "🚀 Pushing database schema..."
npx prisma db push

# Check if migration is needed
echo "🔍 Checking database status..."
npx prisma migrate status

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the development server: npm run dev"
echo "2. View your database: npx prisma studio"
echo ""