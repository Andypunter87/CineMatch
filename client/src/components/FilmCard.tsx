import { type Film } from "@shared/schema";
import { Card } from "@/components/ui/card";

interface FilmCardProps {
  film: Film;
}

export default function FilmCard({ film }: FilmCardProps) {
  return (
    <Card className="recommendation-card bg-gray-900 rounded-lg overflow-hidden shadow-lg border-gray-800 group">
      <div className="relative">
        <img 
          src={film.posterUrl} 
          alt={film.title} 
          className="recommendation-image w-full h-64 object-cover transition-all duration-300 group-hover:brightness-[0.3]"
        />
        <div className="recommendation-details absolute inset-0 bg-gradient-to-t from-dark to-transparent bg-opacity-90 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h3 className="text-xl font-bold">{film.title}</h3>
          <p className="text-gray-300 text-sm">{film.year} | {film.actors.slice(0, 2).join(', ')}</p>
          <p className="mt-2 text-sm">{film.synopsis}</p>
          <div className="mt-4 flex justify-between items-center">
            <span className="text-accent font-medium">{film.genres.join('/')}</span>
            <span className="bg-primary bg-opacity-20 text-primary px-2 py-1 rounded text-xs">
              {film.matchPercentage}% Match
            </span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold truncate">{film.title}</h3>
        <p className="text-gray-400 text-sm">{film.year} | {film.director}</p>
        <p className="mt-2 text-sm text-gray-300">
          <span className="text-secondary">Why this matches:</span> Perfect for {film.matchReason}
        </p>
      </div>
    </Card>
  );
}
