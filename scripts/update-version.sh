#!/bin/bash

# Generate version string
TIMESTAMP=$(date +%s%3N)
VERSION="${TIMESTAMP}-${GITHUB_SHA:-local}"

# Check for required environment variable in zshrc
if [ -z "$NINJA_NOTES_SERVER_SECRET" ]; then
  echo "❌ Missing required environment variable: NINJA_NOTES_SERVER_SECRET"
  echo "Please add it to your ~/.zshrc:"
  echo "export NINJA_NOTES_SERVER_SECRET=your_secret_here"
  exit 1
fi

# Make the API request and store the response
response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: $NINJA_NOTES_SERVER_SECRET" \
  -d "{\"version\":\"$VERSION\"}" \
  "https://dev.api.ninjanotes.live/api/v1/update-build-number")

# Check if curl command was successful
if [ $? -eq 0 ]; then
  # Parse the success field from JSON response
  success=$(echo "$response" | grep -o '"success":\s*\(true\|false\)' | grep -o '\(true\|false\)')
  
  if [ "$success" = "true" ]; then
    echo "✅ Build version updated successfully: $VERSION"
    exit 0
  else
    echo "❌ Server returned error: $response"
    exit 1
  fi
else
  echo "❌ Failed to make request: $response"
  exit 1
fi