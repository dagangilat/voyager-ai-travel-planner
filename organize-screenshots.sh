#!/bin/bash

# Interactive script to organize help screenshots
# Usage: ./organize-screenshots.sh

cd /Users/dagan/dev/firebase/voyager-ai-travel-planner

echo "📸 Help Screenshot Organizer"
echo "=============================="
echo ""
echo "This script will help you organize your screenshots."
echo ""

# Find recent PNG files on Desktop
echo "Looking for PNG files on Desktop..."
SCREENSHOTS=($(find ~/Desktop -name "*.png" -type f 2>/dev/null | sort))

if [ ${#SCREENSHOTS[@]} -eq 0 ]; then
    echo "❌ No PNG files found on Desktop"
    echo ""
    echo "Please ensure your screenshots are saved to Desktop"
    echo "or manually copy them to: public/help-screenshots/"
    exit 1
fi

echo "Found ${#SCREENSHOTS[@]} screenshot(s):"
echo ""
for i in "${!SCREENSHOTS[@]}"; do
    filename=$(basename "${SCREENSHOTS[$i]}")
    filesize=$(du -h "${SCREENSHOTS[$i]}" | cut -f1)
    echo "  [$i] $filename ($filesize)"
done
echo ""

# Required screenshot names
declare -a REQUIRED_NAMES=(
    "create-trip.png:Create Trip page"
    "create-with-ai.png:AI Options dialog"
    "trip-details.png:Trip Details page"
    "share-trip.png:Share dialog"
    "email-example.png:Email notification"
    "search-results.png:Search results"
    "budget-tempo.png:Budget & Tempo selectors"
    "visit-focus.png:Visit Focus tags"
)

echo "Would you like to:"
echo "  1. Copy all screenshots to public/help-screenshots/ (you'll rename them manually)"
echo "  2. Copy specific screenshots with new names (interactive)"
echo "  3. Exit and do it manually"
echo ""
read -p "Choose (1-3): " choice

case $choice in
    1)
        echo ""
        echo "Copying all screenshots..."
        mkdir -p public/help-screenshots
        for screenshot in "${SCREENSHOTS[@]}"; do
            cp "$screenshot" public/help-screenshots/
            echo "✓ Copied $(basename "$screenshot")"
        done
        echo ""
        echo "✅ Done! Screenshots copied to public/help-screenshots/"
        echo "Please rename them to match:"
        for name in "${REQUIRED_NAMES[@]}"; do
            filename=$(echo "$name" | cut -d: -f1)
            echo "  • $filename"
        done
        ;;
    2)
        echo ""
        echo "Let's map your screenshots..."
        mkdir -p public/help-screenshots
        echo ""
        for name in "${REQUIRED_NAMES[@]}"; do
            filename=$(echo "$name" | cut -d: -f1)
            description=$(echo "$name" | cut -d: -f2)
            
            echo "────────────────────────────────────"
            echo "Need: $filename"
            echo "For: $description"
            echo ""
            echo "Available files:"
            for i in "${!SCREENSHOTS[@]}"; do
                echo "  [$i] $(basename "${SCREENSHOTS[$i]}")"
            done
            echo "  [s] Skip this one"
            echo ""
            read -p "Which file? (0-$((${#SCREENSHOTS[@]}-1)) or 's'): " file_choice
            
            if [ "$file_choice" != "s" ] && [ "$file_choice" -ge 0 ] 2>/dev/null && [ "$file_choice" -lt ${#SCREENSHOTS[@]} ]; then
                cp "${SCREENSHOTS[$file_choice]}" "public/help-screenshots/$filename"
                echo "✓ Copied as $filename"
            else
                echo "⏭  Skipped"
            fi
            echo ""
        done
        echo "✅ Done organizing screenshots!"
        ;;
    3)
        echo ""
        echo "No problem! You can manually copy files to:"
        echo "  public/help-screenshots/"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "Next steps:"
echo "  1. Check: ls -lh public/help-screenshots/"
echo "  2. Test: npm run dev"
echo "  3. View: http://localhost:5173/Help"
echo ""
