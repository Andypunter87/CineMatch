import { Film } from '@shared/schema';

export const mockFilms: Film[] = [
  {
    id: 1,
    title: 'The Matrix',
    year: 1999,
    runtime: 136,
    genres: ['Action', 'Sci-Fi'],
    director: 'Lana Wachowski, Lilly Wachowski',
    actors: 'Keanu Reeves, Laurence Fishburne, Carrie-Anne Moss',
    plot: 'A computer hacker learns about the true nature of reality and his role in the war against its controllers.',
    language: 'English',
    country: 'USA',
    posterUrl: 'https://example.com/matrix.jpg',
    imdbRating: 8.7,
    type: 'movie',
    streamingInfo: {
      netflix: { us: { link: 'https://www.netflix.com/title/1234' }},
      prime: { us: { link: 'https://www.amazon.com/gp/video/detail/1234' }}
    }
  },
  {
    id: 2,
    title: 'Inception',
    year: 2010,
    runtime: 148,
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    director: 'Christopher Nolan',
    actors: 'Leonardo DiCaprio, Joseph Gordon-Levitt, Ellen Page',
    plot: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    language: 'English',
    country: 'USA',
    posterUrl: 'https://example.com/inception.jpg',
    imdbRating: 8.8,
    type: 'movie',
    streamingInfo: {
      netflix: { us: { link: 'https://www.netflix.com/title/5678' }}
    }
  },
  {
    id: 3,
    title: 'The Shawshank Redemption',
    year: 1994,
    runtime: 142,
    genres: ['Drama'],
    director: 'Frank Darabont',
    actors: 'Tim Robbins, Morgan Freeman, Bob Gunton',
    plot: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
    language: 'English',
    country: 'USA',
    posterUrl: 'https://example.com/shawshank.jpg',
    imdbRating: 9.3,
    type: 'movie',
    streamingInfo: {
      hulu: { us: { link: 'https://www.hulu.com/title/9012' }}
    }
  },
  {
    id: 4,
    title: 'The Godfather',
    year: 1972,
    runtime: 175,
    genres: ['Crime', 'Drama'],
    director: 'Francis Ford Coppola',
    actors: 'Marlon Brando, Al Pacino, James Caan',
    plot: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
    language: 'English',
    country: 'USA',
    posterUrl: 'https://example.com/godfather.jpg',
    imdbRating: 9.2,
    type: 'movie',
    streamingInfo: {
      prime: { us: { link: 'https://www.amazon.com/gp/video/detail/3456' }}
    }
  },
  {
    id: 5,
    title: 'Pulp Fiction',
    year: 1994,
    runtime: 154,
    genres: ['Crime', 'Drama'],
    director: 'Quentin Tarantino',
    actors: 'John Travolta, Uma Thurman, Samuel L. Jackson',
    plot: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
    language: 'English',
    country: 'USA',
    posterUrl: 'https://example.com/pulpfiction.jpg',
    imdbRating: 8.9,
    type: 'movie',
    streamingInfo: {
      netflix: { us: { link: 'https://www.netflix.com/title/7890' }}
    }
  }
];