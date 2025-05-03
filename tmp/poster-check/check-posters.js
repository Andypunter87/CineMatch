const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Extract film data from the file
const extractFilmData = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const filmObjects = [];
  const regex = /id:\s*(\d+),[\s\S]*?title:\s*"([^"]+)",[\s\S]*?posterUrl:\s*"([^"]+)"/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    filmObjects.push({
      id: match[1],
      title: match[2],
      posterUrl: match[3]
    });
  }
  
  return filmObjects;
};

// Check if a URL is valid
const checkUrl = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
    return response.ok;
  } catch (error) {
    console.error(`Error checking URL ${url}: ${error.message}`);
    return false;
  }
};

// Look up alternative poster URL for a film using TMDB API
const findAlternativePoster = async (title, year) => {
  if (!process.env.TMDB_API_KEY) {
    console.log('TMDB_API_KEY not found in environment');
    return null;
  }
  
  try {
    // Search for the film
    const query = encodeURIComponent(title);
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${query}&year=${year}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (searchData.results && searchData.results.length > 0) {
      const firstResult = searchData.results[0];
      if (firstResult.poster_path) {
        return `https://image.tmdb.org/t/p/w500${firstResult.poster_path}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error finding alternative poster for ${title}: ${error.message}`);
    return null;
  }
};

// Main function
const main = async () => {
  const filePath = path.join(__dirname, '../../server/data/onboarding-films.ts');
  const films = extractFilmData(filePath);
  
  console.log(`Checking ${films.length} film poster URLs...`);
  
  const results = {
    valid: [],
    invalid: [],
    fixed: [],
    unfixable: []
  };
  
  for (const film of films) {
    console.log(`Checking poster for "${film.title}" (ID: ${film.id}): ${film.posterUrl}`);
    
    const isValid = await checkUrl(film.posterUrl);
    
    if (isValid) {
      console.log(`✓ Valid poster URL for "${film.title}"`);
      results.valid.push(film);
    } else {
      console.log(`✗ Invalid poster URL for "${film.title}"`);
      results.invalid.push(film);
      
      // Try to find an alternative
      const year = film.posterUrl.match(/\/(\d{4})\//) ? 
        film.posterUrl.match(/\/(\d{4})\//)[1] : null;
      
      if (year) {
        const alternativeUrl = await findAlternativePoster(film.title, year);
        
        if (alternativeUrl) {
          // Check if alternative URL is valid
          const isAlternativeValid = await checkUrl(alternativeUrl);
          
          if (isAlternativeValid) {
            console.log(`✓ Found alternative poster URL for "${film.title}": ${alternativeUrl}`);
            film.newPosterUrl = alternativeUrl;
            results.fixed.push(film);
          } else {
            console.log(`✗ Alternative poster URL for "${film.title}" is also invalid`);
            results.unfixable.push(film);
          }
        } else {
          console.log(`✗ Could not find alternative poster for "${film.title}"`);
          results.unfixable.push(film);
        }
      } else {
        console.log(`✗ Could not extract year from "${film.title}" poster URL`);
        results.unfixable.push(film);
      }
    }
  }
  
  console.log('\nSummary:');
  console.log(`Total films: ${films.length}`);
  console.log(`Valid posters: ${results.valid.length}`);
  console.log(`Invalid posters: ${results.invalid.length}`);
  console.log(`Fixed posters: ${results.fixed.length}`);
  console.log(`Unfixable posters: ${results.unfixable.length}`);
  
  return results;
};

// Run the main function
main()
  .then(results => {
    console.log('\nInvalid poster URLs:');
    results.invalid.forEach(film => {
      console.log(`- ${film.title} (ID: ${film.id}): ${film.posterUrl}`);
    });

    console.log('\nFixed poster URLs:');
    results.fixed.forEach(film => {
      console.log(`- ${film.title} (ID: ${film.id}): ${film.newPosterUrl}`);
    });

    console.log('\nUnfixable poster URLs:');
    results.unfixable.forEach(film => {
      console.log(`- ${film.title} (ID: ${film.id}): ${film.posterUrl}`);
    });
  })
  .catch(error => {
    console.error('Error:', error);
  });
