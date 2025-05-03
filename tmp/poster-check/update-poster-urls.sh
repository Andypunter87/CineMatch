#!/bin/bash

# Array of films with broken poster URLs
declare -A films=(
  ["Amélie"]="2001"
  ["The Grand Budapest Hotel"]="2014"
  ["Inception"]="2010"
  ["Moonlight"]="2016"
  ["Whiplash"]="2014"
  ["The Social Network"]="2010"
  ["Lady Bird"]="2017"
  ["Get Out"]="2017"
  ["Boyhood"]="2014"
  ["Mad Max: Fury Road"]="2015"
  ["Ex Machina"]="2014"
)

# Function to find a new poster URL
find_new_poster_url() {
  local title="$1"
  local year="$2"
  local query=$(echo "$title" | sed 's/ /%20/g')
  
  # Call TMDB API to search for the film
  response=$(curl -s "https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${query}&year=${year}")
  
  # Extract poster path
  poster_path=$(echo "$response" | grep -o '"poster_path":"/[^"]*"' | head -1 | sed 's/"poster_path":"//;s/"$//')
  
  if [ -n "$poster_path" ]; then
    echo "https://image.tmdb.org/t/p/w500${poster_path}"
    return 0
  else
    return 1
  fi
}

echo "Finding new poster URLs for films with broken URLs:"
echo "=================================================="

# Store updates for each film
declare -A updates

for title in "${!films[@]}"; do
  year="${films[$title]}"
  echo -n "Checking $title ($year): "
  
  new_url=$(find_new_poster_url "$title" "$year")
  
  if [ -n "$new_url" ]; then
    # Verify the new URL works
    status_code=$(curl -s -I -o /dev/null -w "%{http_code}" "$new_url")
    
    if [ "$status_code" == "200" ]; then
      updates["$title"]="$new_url"
      echo "✓ Found new URL: $new_url"
    else
      echo "✗ New URL failed with status $status_code: $new_url"
    fi
  else
    echo "✗ Could not find a new poster URL"
  fi
done

echo ""
echo "Summary of updates:"
echo "=================="
successful=0
failed=0

for title in "${!updates[@]}"; do
  echo "- $title: ${updates[$title]}"
  ((successful++))
done

failed=$((${#films[@]} - successful))

echo ""
echo "Successfully found $successful new URLs"
echo "Failed to find $failed new URLs"

# Output the mappings for easy updates
echo ""
echo "Use these mappings to update the file:"
echo "====================================="

for title in "${!updates[@]}"; do
  old_url=$(grep -A 5 "title: \"$title\"" server/data/onboarding-films.ts | grep 'posterUrl:' | sed 's/.*posterUrl: "\([^"]*\)".*/\1/')
  echo "$title:"
  echo "  Old: $old_url"
  echo "  New: ${updates[$title]}"
  echo ""
done
