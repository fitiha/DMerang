#!/bin/bash

# This script will open Playwright's codegen tool
# It will help us identify the correct selectors for Instagram

echo "Starting Playwright Codegen..."
echo "Instructions:"
echo "1. The browser will open"
echo "2. Navigate to an Instagram profile (e.g., instagram.com/username)"
echo "3. Click the buttons you want to interact with (Message button, 3-dots menu, etc.)"
echo "4. Playwright will generate the selectors for you"
echo ""
echo "Press Ctrl+C to stop recording"
echo ""

cd "$(dirname "$0")/../../packages/automation"
npx playwright codegen instagram.com
