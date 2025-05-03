import { Film } from "@shared/schema";

/**
 * Curated list of films for onboarding with guaranteed complete metadata and valid poster images
 * This ensures a consistent onboarding experience without relying on dynamic TMDB data
 */
export const onboardingFilms: Film[] = [
  {
    id: 101,
    title: "Everything Everywhere All at Once",
    year: 2022,
    director: "Daniels",
    actors: ["Michelle Yeoh", "Ke Huy Quan", "Jamie Lee Curtis"],
    synopsis: "An immigrant mother gets swept up in an interdimensional adventure where she alone can save existence by exploring other universes.",
    genres: ["Comedy", "Sci-Fi", "Action"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w500/u68AjlvlutfEIcpmbYpKcdi09ut.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 102,
    title: "Amélie",
    year: 2001,
    director: "Jean-Pierre Jeunet",
    actors: ["Audrey Tautou", "Mathieu Kassovitz", "Rufus"],
    synopsis: "A quirky young woman decides to change the lives of those around her for the better, while struggling with her own isolation.",
    genres: ["Comedy", "Romance"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w500/oTKduWL2tpIKEmkAqF4mFEAWAsv.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 103,
    title: "The Dark Knight",
    year: 2008,
    director: "Christopher Nolan",
    actors: ["Christian Bale", "Heath Ledger", "Aaron Eckhart"],
    synopsis: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    genres: ["Action", "Crime", "Drama"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 104,
    title: "Parasite",
    year: 2019,
    director: "Bong Joon-ho",
    actors: ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong"],
    synopsis: "A poor family, the Kims, con their way into becoming the servants of a rich family, the Parks. But their easy life gets complicated when their deception is threatened with exposure.",
    genres: ["Comedy", "Drama", "Thriller"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 105,
    title: "Spider-Man: Into the Spider-Verse",
    year: 2018,
    director: "Bob Persichetti, Peter Ramsey, Rodney Rothman",
    actors: ["Shameik Moore", "Jake Johnson", "Hailee Steinfeld"],
    synopsis: "Teen Miles Morales becomes the Spider-Man of his universe, and must join with five spider-powered individuals from other dimensions to stop a threat for all realities.",
    genres: ["Animation", "Action", "Adventure"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 106,
    title: "The Grand Budapest Hotel",
    year: 2014,
    director: "Wes Anderson",
    actors: ["Ralph Fiennes", "F. Murray Abraham", "Mathieu Amalric"],
    synopsis: "A writer encounters the owner of an aging high-class hotel, who tells him of his early years serving as a lobby boy in the hotel's glorious years under an exceptional concierge.",
    genres: ["Comedy", "Drama"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 107,
    title: "Inception",
    year: 2010,
    director: "Christopher Nolan",
    actors: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Ellen Page"],
    synopsis: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    genres: ["Action", "Sci-Fi", "Thriller"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w500/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 108,
    title: "Eternal Sunshine of the Spotless Mind",
    year: 2004,
    director: "Michel Gondry",
    actors: ["Jim Carrey", "Kate Winslet", "Kirsten Dunst"],
    synopsis: "When their relationship turns sour, a couple undergoes a medical procedure to have each other erased from their memories.",
    genres: ["Drama", "Romance", "Sci-Fi"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w500/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 109,
    title: "Pulp Fiction",
    year: 1994,
    director: "Quentin Tarantino",
    actors: ["John Travolta", "Uma Thurman", "Samuel L. Jackson"],
    synopsis: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    genres: ["Crime", "Drama"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 110,
    title: "The Shawshank Redemption",
    year: 1994,
    director: "Frank Darabont",
    actors: ["Tim Robbins", "Morgan Freeman", "Bob Gunton"],
    synopsis: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
    genres: ["Drama"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 111,
    title: "La La Land",
    year: 2016,
    director: "Damien Chazelle",
    actors: ["Ryan Gosling", "Emma Stone", "John Legend"],
    synopsis: "While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations for the future.",
    genres: ["Comedy", "Drama", "Music"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 112,
    title: "The Godfather",
    year: 1972,
    director: "Francis Ford Coppola",
    actors: ["Marlon Brando", "Al Pacino", "James Caan"],
    synopsis: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
    genres: ["Crime", "Drama"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 113,
    title: "Moonlight",
    year: 2016,
    director: "Barry Jenkins",
    actors: ["Mahershala Ali", "Naomie Harris", "Trevante Rhodes"],
    synopsis: "A young African-American man grapples with his identity and sexuality while experiencing the everyday struggles of childhood, adolescence, and burgeoning adulthood.",
    genres: ["Drama"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w500/rcICfiL9fvwRjoWHxW8QeroLYrJ.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 114,
    title: "The Matrix",
    year: 1999,
    director: "Lana and Lilly Wachowski",
    actors: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
    synopsis: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
    genres: ["Action", "Sci-Fi"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 115,
    title: "Interstellar",
    year: 2014,
    director: "Christopher Nolan",
    actors: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
    synopsis: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    genres: ["Adventure", "Drama", "Sci-Fi"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 116,
    title: "Whiplash",
    year: 2014,
    director: "Damien Chazelle",
    actors: ["Miles Teller", "J.K. Simmons", "Melissa Benoist"],
    synopsis: "A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student's potential.",
    genres: ["Drama", "Music"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w500/7fn624j5lj3xTme2SgiLCeuedmO.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 117,
    title: "The Social Network",
    year: 2010,
    director: "David Fincher",
    actors: ["Jesse Eisenberg", "Andrew Garfield", "Justin Timberlake"],
    synopsis: "Harvard student Mark Zuckerberg creates the social networking site that would become known as Facebook, but is later sued by two brothers who claimed he stole their idea, and the co-founder who was later squeezed out of the business.",
    genres: ["Biography", "Drama"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w500/n0ybibhJtQ5icDqTp8eRytcIHJx.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 118,
    title: "Lady Bird",
    year: 2017,
    director: "Greta Gerwig",
    actors: ["Saoirse Ronan", "Laurie Metcalf", "Tracy Letts"],
    synopsis: "In 2002, an artistically inclined seventeen-year-old girl comes of age in Sacramento, California.",
    genres: ["Comedy", "Drama"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w500/gl66K7zRdtNYGrxyS2YDUP5ASZd.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 119,
    title: "Get Out",
    year: 2017,
    director: "Jordan Peele",
    actors: ["Daniel Kaluuya", "Allison Williams", "Bradley Whitford"],
    synopsis: "A young African-American visits his white girlfriend's parents for the weekend, where his simmering uneasiness about their reception of him eventually reaches a boiling point.",
    genres: ["Horror", "Mystery", "Thriller"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w500/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 120,
    title: "The Lobster",
    year: 2015,
    director: "Yorgos Lanthimos",
    actors: ["Colin Farrell", "Rachel Weisz", "Jessica Barden"],
    synopsis: "In a dystopian near future, single people, according to the laws of The City, are taken to The Hotel, where they are obliged to find a romantic partner in forty-five days or are transformed into beasts and sent off into The Woods.",
    genres: ["Comedy", "Drama", "Romance"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 121,
    title: "Blade Runner 2049",
    year: 2017,
    director: "Denis Villeneuve",
    actors: ["Ryan Gosling", "Harrison Ford", "Ana de Armas"],
    synopsis: "A young blade runner's discovery of a long-buried secret leads him to track down former blade runner Rick Deckard, who's been missing for thirty years.",
    genres: ["Action", "Drama", "Sci-Fi"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 122,
    title: "Boyhood",
    year: 2014,
    director: "Richard Linklater",
    actors: ["Ellar Coltrane", "Patricia Arquette", "Ethan Hawke"],
    synopsis: "The life of Mason, from early childhood to his arrival at college.",
    genres: ["Drama"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w500/2BvtvDUyxiMJ4dmKfiQf4qdOHQN.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 123,
    title: "Mad Max: Fury Road",
    year: 2015,
    director: "George Miller",
    actors: ["Tom Hardy", "Charlize Theron", "Nicholas Hoult"],
    synopsis: "In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland with the aid of a group of female prisoners, a psychotic worshiper, and a drifter named Max.",
    genres: ["Action", "Adventure", "Sci-Fi"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w500/hA2ple9q4qnwxp3hKVNhroipsir.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  },
  {
    id: 124,
    title: "Ex Machina",
    year: 2014,
    director: "Alex Garland",
    actors: ["Alicia Vikander", "Domhnall Gleeson", "Oscar Isaac"],
    synopsis: "A young programmer is selected to participate in a ground-breaking experiment in synthetic intelligence by evaluating the human qualities of a highly advanced humanoid AI.",
    genres: ["Drama", "Sci-Fi", "Thriller"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w500/dmJW8IAKHKxFNiUnoDR7JfsK7Rp.jpg",
    hasCompleteData: true,
    hasStreamingData: true
  }
];

/**
 * Shuffles and returns films from the curated list
 * 
 * @param count Number of films to return
 * @param offset Offset to skip films (for pagination)
 * @param seed Seed for consistent random order
 * @returns Array of shuffled films
 */
export function getCuratedOnboardingFilms(count: number = 12, offset: number = 0, seed: number = Date.now()): Film[] {
  // Seeded pseudo-random number generator for consistent shuffling
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Fisher-Yates shuffle with seeded randomness
  const shuffleWithSeed = (array: Film[], seed: number) => {
    const shuffled = [...array];
    let currentSeed = seed;
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      currentSeed = seededRandom(currentSeed) * 10000;
      const j = Math.floor(seededRandom(currentSeed) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  };

  // Shuffle the films based on the seed
  const shuffledFilms = shuffleWithSeed(onboardingFilms, seed);
  
  // Apply offset and limit
  return shuffledFilms.slice(offset, offset + count);
}