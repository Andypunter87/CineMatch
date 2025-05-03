#!/bin/bash

# Extract all poster URLs from the file
grep -o 'posterUrl: "https://image.tmdb.org/t/p/w500/[^"]*"' server/data/onboarding-films.ts | sed 's/posterUrl: "//;s/"$//' > tmp/poster-check/poster-urls.txt

# Check each URL
echo "Checking all poster URLs..."
echo ""

broken_urls=()
working_urls=()

while IFS= read -r url; do
  movie_id=$(echo "$url" | grep -o '/[^/]*$' | sed 's/\///')
  movie_title=$(grep -A 5 "$url" server/data/onboarding-films.ts | grep 'title:' | head -1 | sed 's/.*title: "\([^"]*\)".*/\1/')
  
  status_code=$(curl -s -I -o /dev/null -w "%{http_code}" "$url")
  
  if [ "$status_code" == "200" ]; then
    working_urls+=("$movie_title: $url")
    echo "✓ $movie_title: $url (OK)"
  else
    broken_urls+=("$movie_title: $url")
    echo "✗ $movie_title: $url (Status: $status_code)"
  fi
done < tmp/poster-check/poster-urls.txt

echo ""
echo "Summary:"
echo "=========="
echo "Working URLs: ${#working_urls[@]}"
echo "Broken URLs: ${#broken_urls[@]}"

if [ ${#broken_urls[@]} -gt 0 ]; then
  echo ""
  echo "Broken URLs:"
  for url in "${broken_urls[@]}"; do
    echo "- $url"
  done
fi
