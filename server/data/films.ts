import { Film } from "@shared/schema";

export const films: Film[] = [
  {
    id: 1,
    title: "Everything Everywhere All at Once",
    year: 2022,
    director: "Daniels",
    actors: ["Michelle Yeoh", "Ke Huy Quan", "Jamie Lee Curtis"],
    synopsis: "An immigrant mother gets swept up in an interdimensional adventure where she alone can save existence by exploring other universes.",
    genres: ["Comedy", "Sci-Fi", "Action"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/w3LxiVE8TvCkSSJ3L5LY23mpvzb.jpg"
  },
  {
    id: 2,
    title: "Amélie",
    year: 2001,
    director: "Jean-Pierre Jeunet",
    actors: ["Audrey Tautou", "Mathieu Kassovitz", "Rufus"],
    synopsis: "A quirky young woman decides to change the lives of those around her for the better, while struggling with her own isolation.",
    genres: ["Comedy", "Romance"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/fayp6O3uvfkFVGYJfA0no1ZJLiG.jpg"
  },
  {
    id: 3,
    title: "The Dark Knight",
    year: 2008,
    director: "Christopher Nolan",
    actors: ["Christian Bale", "Heath Ledger", "Aaron Eckhart"],
    synopsis: "Batman faces his ultimate test against the Joker, a criminal mastermind wreaking havoc on Gotham City.",
    genres: ["Action", "Crime", "Thriller"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/qJ2tW6WMUDux911r6m7haRef0WH.jpg"
  },
  {
    id: 4,
    title: "Parasite",
    year: 2019,
    director: "Bong Joon-ho",
    actors: ["Song Kang-ho", "Lee Sun-kyun", "Cho Yeo-jeong"],
    synopsis: "A poor family schemes to become employed by a wealthy family, infiltrating their household by posing as unrelated, highly qualified individuals.",
    genres: ["Comedy", "Drama", "Thriller"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg"
  },
  {
    id: 5,
    title: "The Shawshank Redemption",
    year: 1994,
    director: "Frank Darabont",
    actors: ["Tim Robbins", "Morgan Freeman", "Bob Gunton"],
    synopsis: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
    genres: ["Drama"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg"
  },
  {
    id: 6,
    title: "Oldboy",
    year: 2003,
    director: "Park Chan-wook",
    actors: ["Choi Min-sik", "Yoo Ji-tae", "Kang Hye-jung"],
    synopsis: "After being kidnapped and imprisoned for fifteen years, Oh Dae-Su is released, only to find that he must find his captor in five days.",
    genres: ["Action", "Drama", "Mystery"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/vgIQWwvkxAobNHzBIRHlwYH9A9P.jpg"
  },
  {
    id: 7,
    title: "The Royal Tenenbaums",
    year: 2001,
    director: "Wes Anderson",
    actors: ["Gene Hackman", "Anjelica Huston", "Ben Stiller"],
    synopsis: "The eccentric members of a dysfunctional family reluctantly gather under the same roof for various reasons.",
    genres: ["Comedy", "Drama"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/xtCEwM36VJwNLQ0X5P2Zk8fWLZk.jpg"
  },
  {
    id: 8,
    title: "Inception",
    year: 2010,
    director: "Christopher Nolan",
    actors: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Ellen Page"],
    synopsis: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    genres: ["Action", "Adventure", "Sci-Fi"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/edv5CZvWj09upOsy71SPObV4TQr.jpg"
  },
  {
    id: 9,
    title: "Y Tu Mamá También",
    year: 2001,
    director: "Alfonso Cuarón",
    actors: ["Maribel Verdú", "Gael García Bernal", "Diego Luna"],
    synopsis: "In Mexico, two teenage boys and an attractive older woman embark on a road trip and learn a thing or two about life, friendship, sex, and each other.",
    genres: ["Drama", "Romance"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/gX2d0BsFgZ9qg3TQOFEbQiIyFop.jpg"
  },
  {
    id: 10,
    title: "The Avengers",
    year: 2012,
    director: "Joss Whedon",
    actors: ["Robert Downey Jr.", "Chris Evans", "Scarlett Johansson"],
    synopsis: "Earth's mightiest heroes must come together and learn to fight as a team if they are going to stop the mischievous Loki from enslaving humanity.",
    genres: ["Action", "Adventure", "Sci-Fi"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg"
  },
  {
    id: 11,
    title: "The Farewell",
    year: 2019,
    director: "Lulu Wang",
    actors: ["Awkwafina", "Tzi Ma", "Diana Lin"],
    synopsis: "A Chinese family discovers their grandmother has only a short while left to live and decide to keep her in the dark, scheduling a wedding to gather before she dies.",
    genres: ["Comedy", "Drama"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/7sFXUA9t5jcbAtuCGbTQS3H9JMw.jpg"
  },
  {
    id: 12,
    title: "Pulp Fiction",
    year: 1994,
    director: "Quentin Tarantino",
    actors: ["John Travolta", "Uma Thurman", "Samuel L. Jackson"],
    synopsis: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    genres: ["Crime", "Drama"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg"
  },
  {
    id: 13,
    title: "Moonlight",
    year: 2016,
    director: "Barry Jenkins",
    actors: ["Mahershala Ali", "Naomie Harris", "Trevante Rhodes"],
    synopsis: "A young African-American man grapples with his identity and sexuality while experiencing the everyday struggles of childhood, adolescence, and burgeoning adulthood.",
    genres: ["Drama"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/93hrC1d9jWm5KCyJCfRcxH6AeQG.jpg"
  },
  {
    id: 14,
    title: "Get Out",
    year: 2017,
    director: "Jordan Peele",
    actors: ["Daniel Kaluuya", "Allison Williams", "Bradley Whitford"],
    synopsis: "A young African-American visits his white girlfriend's parents for the weekend, where his simmering uneasiness about their reception of him eventually reaches a boiling point.",
    genres: ["Horror", "Mystery", "Thriller"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/qbaIHiSh4T5UIUHzwbXxAnlQlil.jpg"
  },
  {
    id: 15,
    title: "City of God",
    year: 2002,
    director: "Fernando Meirelles",
    actors: ["Alexandre Rodrigues", "Leandro Firmino", "Matheus Nachtergaele"],
    synopsis: "In the slums of Rio, two kids' paths diverge as one struggles to become a photographer and the other a kingpin.",
    genres: ["Crime", "Drama"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/k7eYdWvhYQyRQoU2TB2A2Xu2TfD.jpg"
  },
  {
    id: 16,
    title: "The Lion King",
    year: 1994,
    director: "Roger Allers",
    actors: ["Matthew Broderick", "Jeremy Irons", "James Earl Jones"],
    synopsis: "Lion prince Simba and his father are targeted by his bitter uncle, who wants to ascend the throne himself.",
    genres: ["Animation", "Adventure", "Drama"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg"
  },
  {
    id: 17,
    title: "Portrait of a Lady on Fire",
    year: 2019,
    director: "Céline Sciamma",
    actors: ["Noémie Merlant", "Adèle Haenel", "Luàna Bajrami"],
    synopsis: "On an isolated island in Brittany at the end of the eighteenth century, a female painter is obliged to paint a wedding portrait of a young woman.",
    genres: ["Drama", "Romance"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/3NTEMlG5mQdIAlKDl3AJG0rX29Z.jpg"
  },
  {
    id: 18,
    title: "Toy Story",
    year: 1995,
    director: "John Lasseter",
    actors: ["Tom Hanks", "Tim Allen", "Don Rickles"],
    synopsis: "A cowboy doll is profoundly threatened and jealous when a new spaceman figure supplants him as top toy in a boy's room.",
    genres: ["Animation", "Adventure", "Comedy"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg"
  },
  {
    id: 19,
    title: "Pan's Labyrinth",
    year: 2006,
    director: "Guillermo del Toro",
    actors: ["Ivana Baquero", "Ariadna Gil", "Sergi López"],
    synopsis: "In the Falangist Spain of 1944, the bookish young stepdaughter of a sadistic army officer escapes into an eerie but captivating fantasy world.",
    genres: ["Drama", "Fantasy", "War"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/i0VpTGXPCX6v4piB2TlCLhSQVaZ.jpg"
  },
  {
    id: 20,
    title: "The Godfather",
    year: 1972,
    director: "Francis Ford Coppola",
    actors: ["Marlon Brando", "Al Pacino", "James Caan"],
    synopsis: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
    genres: ["Crime", "Drama"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/3bhkrj58Vtu7enYsRolD1fZdja1.jpg"
  },
  {
    id: 21,
    title: "Spirited Away",
    year: 2001,
    director: "Hayao Miyazaki",
    actors: ["Rumi Hiiragi", "Miyu Irino", "Mari Natsuki"],
    synopsis: "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts.",
    genres: ["Animation", "Adventure", "Family"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg"
  },
  {
    id: 22,
    title: "The Hangover",
    year: 2009,
    director: "Todd Phillips",
    actors: ["Bradley Cooper", "Ed Helms", "Zach Galifianakis"],
    synopsis: "Three buddies wake up from a bachelor party in Las Vegas, with no memory of the previous night and the bachelor missing.",
    genres: ["Comedy"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/uluhlXubGu1VxU63X9VHCLWDAYP.jpg"
  },
  {
    id: 23,
    title: "Yi Yi",
    year: 2000,
    director: "Edward Yang",
    actors: ["Nien-Jen Wu", "Elaine Jin", "Issei Ogata"],
    synopsis: "Each member of a middle class Taipei family seeks to reconcile past and present relationships within their daily lives.",
    genres: ["Drama", "Romance"],
    type: "indie",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/ryA733pZR6E7XXr0QlQQXKbJe2G.jpg"
  },
  {
    id: 24,
    title: "The Matrix",
    year: 1999,
    director: "Lana Wachowski",
    actors: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
    synopsis: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
    genres: ["Action", "Sci-Fi"],
    type: "mainstream",
    posterUrl: "https://image.tmdb.org/t/p/w600_and_h900_bestv2/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg"
  }
];
