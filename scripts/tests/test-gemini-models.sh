#!/bin/bash

# Test Gemini Models Script
# Tests all Gemini models with a sample trip generation prompt to verify availability

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Gemini Models Availability Test${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Get API key from .env file
if [ -f .env ]; then
    GEMINI_API_KEY=$(grep GEMINI_API_KEY .env | cut -d '=' -f2)
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo -e "${RED}Error: GEMINI_API_KEY not found in .env file${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API Key loaded${NC}"
echo ""

# List of models to test
MODELS=(
    "gemini-1.5-flash-latest"
    "gemini-1.5-pro-latest"
    "gemini-1.5-flash"
    "gemini-1.5-pro"
    "gemini-1.0-pro"
    "gemini-2.0-flash-exp"
    "gemini-exp-1206"
)

# Sample prompt similar to AI trip generation
PROMPT="Generate a 3-day trip itinerary to Paris, France departing from London. Include transportation, lodging, and experiences."

# Results arrays
WORKING_MODELS=()
FAILED_MODELS=()

echo -e "${BLUE}Testing models with sample prompt:${NC}"
echo -e "${YELLOW}\"$PROMPT\"${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test each model
for MODEL in "${MODELS[@]}"; do
    echo -e "${BLUE}Testing: $MODEL${NC}"
    
    # Create JSON payload
    JSON_PAYLOAD=$(cat <<EOF
{
  "contents": [{
    "parts": [{
      "text": "$PROMPT"
    }]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "topK": 40,
    "topP": 0.95,
    "maxOutputTokens": 1024
  }
}
EOF
)
    
    # Make API request
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "$JSON_PAYLOAD")
    
    # Get HTTP status code (last line)
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    
    # Get response body (everything except last line)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    # Check if successful
    if [ "$HTTP_CODE" = "200" ]; then
        # Check if response has content
        if echo "$BODY" | jq -e '.candidates[0].content.parts[0].text' > /dev/null 2>&1; then
            TEXT_PREVIEW=$(echo "$BODY" | jq -r '.candidates[0].content.parts[0].text' | head -c 100)
            echo -e "${GREEN}✓ SUCCESS${NC}"
            echo -e "  Preview: ${TEXT_PREVIEW}..."
            WORKING_MODELS+=("$MODEL")
        else
            echo -e "${YELLOW}⚠ PARTIAL SUCCESS (no text content)${NC}"
            echo -e "  Response: $(echo "$BODY" | jq -c '.')"
            FAILED_MODELS+=("$MODEL (no content)")
        fi
    else
        ERROR_MSG=$(echo "$BODY" | jq -r '.error.message // "Unknown error"' 2>/dev/null || echo "Unknown error")
        echo -e "${RED}✗ FAILED (HTTP $HTTP_CODE)${NC}"
        echo -e "  Error: $ERROR_MSG"
        FAILED_MODELS+=("$MODEL (HTTP $HTTP_CODE)")
    fi
    
    echo ""
    
    # Add small delay to avoid rate limiting
    sleep 1
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Test Results Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Print working models
if [ ${#WORKING_MODELS[@]} -gt 0 ]; then
    echo -e "${GREEN}✓ Working Models (${#WORKING_MODELS[@]}):${NC}"
    for MODEL in "${WORKING_MODELS[@]}"; do
        echo -e "  ${GREEN}✓${NC} $MODEL"
    done
    echo ""
fi

# Print failed models
if [ ${#FAILED_MODELS[@]} -gt 0 ]; then
    echo -e "${RED}✗ Failed Models (${#FAILED_MODELS[@]}):${NC}"
    for MODEL in "${FAILED_MODELS[@]}"; do
        echo -e "  ${RED}✗${NC} $MODEL"
    done
    echo ""
fi

# Recommendations
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Recommendations${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

if [ ${#WORKING_MODELS[@]} -gt 0 ]; then
    echo -e "${GREEN}Update functions/gemini-models.json with these working models:${NC}"
    echo ""
    echo "{"
    echo "  \"gemini_models\": ["
    
    for i in "${!WORKING_MODELS[@]}"; do
        MODEL="${WORKING_MODELS[$i]}"
        NAME=$(echo "$MODEL" | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')
        
        if [ $i -eq $((${#WORKING_MODELS[@]} - 1)) ]; then
            # Last item, no comma
            echo "    {"
            echo "      \"name\": \"$NAME\","
            echo "      \"api_name\": \"$MODEL\","
            echo "      \"description\": \"Verified working model\""
            echo "    }"
        else
            # Not last item, add comma
            echo "    {"
            echo "      \"name\": \"$NAME\","
            echo "      \"api_name\": \"$MODEL\","
            echo "      \"description\": \"Verified working model\""
            echo "    },"
        fi
    done
    
    echo "  ]"
    echo "}"
    echo ""
else
    echo -e "${RED}No working models found! Check your API key and quota.${NC}"
    echo ""
fi

# API info
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Additional Information${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Official Gemini API Documentation:"
echo "https://ai.google.dev/gemini-api/docs/models/gemini"
echo ""
echo "List all available models:"
echo "curl 'https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY' | jq '.models[] | {name, displayName, description}'"
echo ""
