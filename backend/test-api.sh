#!/bin/bash

# VoyageBoard API Test Script
# Make sure your server is running: npm run dev

BASE_URL="http://localhost:3001"
SESSION_TOKEN=$(uuidgen)

echo "🧪 Testing VoyageBoard API"
echo "=========================="
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
curl -s "${BASE_URL}/health" | jq '.'
echo ""

# Test 2: API Info
echo "2️⃣  Testing API Info..."
curl -s "${BASE_URL}/api" | jq '.'
echo ""

# Test 3: Autocomplete (Simple)
echo "3️⃣  Testing Autocomplete - New York..."
curl -s "${BASE_URL}/api/places/autocomplete?input=New%20York" | jq '.'
echo ""

# Test 4: Autocomplete with Session Token
echo "4️⃣  Testing Autocomplete with Session Token - Paris..."
curl -s "${BASE_URL}/api/places/autocomplete?input=Paris&sessionToken=${SESSION_TOKEN}" | jq '.'
echo ""

# Test 5: Place Details (New York City)
echo "5️⃣  Testing Place Details - New York City..."
curl -s "${BASE_URL}/api/places/details/ChIJOwg_06VPwokRYv534QaPC8g" | jq '.'
echo ""

# Test 6: Error Handling - Missing Input
echo "6️⃣  Testing Error Handling - Missing Input..."
curl -s "${BASE_URL}/api/places/autocomplete" | jq '.'
echo ""

echo "✅ All tests completed!"
echo "Session Token used: ${SESSION_TOKEN}"
