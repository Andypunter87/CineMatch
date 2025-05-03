#!/bin/bash

# Create a temporary file to store the results
results_file=$(mktemp)

# Process the file line by line to identify films and their poster URLs
while IFS= read -r line; do
  if [[ $line =~ title:.*\"([^\"]+)\" ]]; then
    current_title="${BASH_REMATCH[1]}"
  elif [[ $line =~ posterUrl:.*\"([^\"]+)\" ]]; then
    poster_url="${BASH_REMATCH[1]}"
    
    # Check if the URL is valid
    status_code=$(curl -s -I -o /dev/null -w "%{http_code}" "$poster_url")
    
    if [ "$status_code" == "200" ]; then
      echo "✓ $current_title: $poster_url (OK)" >> "$results_file"
    else
      echo "✗ $current_title: $poster_url (Status: $status_code)" >> "$results_file"
    fi
  fi
done < server/data/onboarding-films.ts

# Display the results
cat "$results_file" | sort

# Count broken and working URLs
broken_count=$(grep -c "^✗" "$results_file")
working_count=$(grep -c "^✓" "$results_file")

echo ""
echo "Summary:"
echo "=========="
echo "Working URLs: $working_count"
echo "Broken URLs: $broken_count"

if [ "$broken_count" -gt 0 ]; then
  echo ""
  echo "Films with broken URLs:"
  grep "^✗" "$results_file" | sed 's/^✗ /- /'
fi

# Clean up
rm "$results_file"
