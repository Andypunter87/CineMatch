import { Film } from '@shared/schema';

export const mockFilms: Film[] = [
  {
    id: 1,
    title: 'The Matrix',
    year: 1999,
    director: 'Lana Wachowski, Lilly Wachowski',
    actors: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss'],
    synopsis: 'A computer hacker learns about the true nature of reality and his role in the war against its controllers.',
    genres: ['Action', 'Sci-Fi'],
    type: 'mainstream',
    posterUrl: 'https://example.com/matrix.jpg',
    runtime: 136,
    originalLanguage: 'English',
    releaseDate: '1999-03-31',
    voteAverage: 8.7,
    tmdbId: 603,
    availableStreamingByCountry: {
      US: ['netflix', 'prime'],
      UK: ['netflix']
    },
    hasStreamingData: true,
    hasCompleteData: true
  },
  {
    id: 2,
    title: 'Inception',
    year: 2010,
    director: 'Christopher Nolan',
    actors: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page'],
    synopsis: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    type: 'mainstream',
    posterUrl: 'https://example.com/inception.jpg',
    runtime: 148,
    originalLanguage: 'English',
    releaseDate: '2010-07-16',
    voteAverage: 8.8,
    tmdbId: 27205,
    availableStreamingByCountry: {
      US: ['netflix'],
      UK: ['netflix']
    },
    hasStreamingData: true,
    hasCompleteData: true
  },
  {
    id: 3,
    title: 'The Shawshank Redemption',
    year: 1994,
    director: 'Frank Darabont',
    actors: ['Tim Robbins', 'Morgan Freeman', 'Bob Gunton'],
    synopsis: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    genres: ['Drama'],
    type: 'mainstream',
    posterUrl: 'https://example.com/shawshank.jpg',
    runtime: 142,
    originalLanguage: 'English',
    releaseDate: '1994-09-23',
    voteAverage: 9.3,
    tmdbId: 278,
    availableStreamingByCountry: {
      US: ['hulu']
    },
    hasStreamingData: true,
    hasCompleteData: true
  },
  {
    id: 4,
    title: 'The Godfather',
    year: 1972,
    director: 'Francis Ford Coppola',
    actors: ['Marlon Brando', 'Al Pacino', 'James Caan'],
    synopsis: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
    genres: ['Crime', 'Drama'],
    type: 'mainstream',
    posterUrl: 'https://example.com/godfather.jpg',
    runtime: 175,
    originalLanguage: 'English',
    releaseDate: '1972-03-24',
    voteAverage: 9.2,
    tmdbId: 238,
    availableStreamingByCountry: {
      US: ['prime']
    },
    hasStreamingData: true,
    hasCompleteData: true
  },
  {
    id: 5,
    title: 'Lost in Translation',
    year: 2003,
    director: 'Sofia Coppola',
    actors: ['Bill Murray', 'Scarlett Johansson', 'Giovanni Ribisi'],
    synopsis: 'A faded movie star and a neglected young woman form an unlikely bond after crossing paths in Tokyo.',
    genres: ['Drama', 'Romance'],
    type: 'indie',
    posterUrl: 'https://example.com/lostintranslation.jpg',
    runtime: 102,
    originalLanguage: 'English',
    releaseDate: '2003-10-03',
    voteAverage: 7.8,
    tmdbId: 597,
    availableStreamingByCountry: {
      US: ['netflix']
    },
    hasStreamingData: true,
    hasCompleteData: true
  }
];