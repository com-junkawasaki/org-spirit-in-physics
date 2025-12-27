#!/bin/sh
TARGET_DIR=${1:-/app/www}
echo "Replacing environment variables in $TARGET_DIR"
find "$TARGET_DIR" -name "*.html" -exec sed -i "s|__PUBLIC_CLERK_PUBLISHABLE_KEY__|${PUBLIC_CLERK_PUBLISHABLE_KEY}|g" {} +
find "$TARGET_DIR" -name "*.html" -exec sed -i "s|__PUBLIC_API_URL__|${PUBLIC_API_URL}|g" {} +
find "$TARGET_DIR" -name "*.html" -exec sed -i "s|__PUBLIC_SUPABASE_URL__|${PUBLIC_SUPABASE_URL}|g" {} +
find "$TARGET_DIR" -name "*.html" -exec sed -i "s|__PUBLIC_SUPABASE_ANON_KEY__|${PUBLIC_SUPABASE_ANON_KEY}|g" {} +
