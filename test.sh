#!/bin/bash

# Easy testing script for video generation API
# Usage: ./test.sh [optional-port]

PORT=${1:-3000}
API_URL="http://localhost:$PORT/api/generate"

echo "🎬 Testing Video Generation API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Submit job
echo "📤 Submitting video generation job..."
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d @test_request.json)

echo "$RESPONSE" | jq '.'

JOB_ID=$(echo "$RESPONSE" | jq -r '.jobId')

if [ "$JOB_ID" == "null" ] || [ -z "$JOB_ID" ]; then
  echo ""
  echo "❌ Failed to get job ID"
  exit 1
fi

echo ""
echo "✅ Job created: $JOB_ID"
echo ""
echo "📊 Checking status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Poll status
while true; do
  STATUS_RESPONSE=$(curl -s "http://localhost:$PORT/api/status/$JOB_ID")
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')

  if [ "$STATUS" == "completed" ]; then
    echo ""
    echo "✅ Video generation completed!"
    echo ""
    echo "$STATUS_RESPONSE" | jq '.'

    VIDEO_URL=$(echo "$STATUS_RESPONSE" | jq -r '.result.videoUrl')
    echo ""
    echo "🎥 Video URL: $VIDEO_URL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    break
  elif [ "$STATUS" == "failed" ]; then
    echo ""
    echo "❌ Video generation failed"
    echo ""
    echo "$STATUS_RESPONSE" | jq '.'
    exit 1
  else
    PROGRESS=$(echo "$STATUS_RESPONSE" | jq -r '.progress // 0')
    printf "\r⏳ Status: $STATUS | Progress: ${PROGRESS}%%"
    sleep 2
  fi
done
