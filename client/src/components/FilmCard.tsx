import { type Film } from "@shared/schema";
import { Card } from "@/components/ui/card";

interface FilmCardProps {
  film: Film;
}

export default function FilmCard({ film }: FilmCardProps) {
  return (
    <Card className="recommendation-card bg-white rounded-lg overflow-hidden shadow-lg border border-blue-100 group hover:shadow-xl transition-all duration-200">
      <div className="relative">
        <img 
          src={film.posterUrl} 
          alt={film.title} 
          className="recommendation-image w-full h-64 object-cover transition-all duration-300 group-hover:brightness-[0.8]"
        />
        <div className="recommendation-details absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h3 className="text-xl font-bold text-white">{film.title}</h3>
          <p className="text-gray-200 text-sm">{film.year} | {film.actors.slice(0, 2).join(', ')}</p>
          <p className="mt-2 text-sm text-white">{film.synopsis}</p>
          <div className="mt-4 flex justify-between items-center">
            <span className="text-blue-200 font-medium">{film.genres.join(' / ')}</span>
            <span className="bg-primary text-white px-2 py-1 rounded text-xs font-semibold">
              {film.matchPercentage}% Match
            </span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold truncate text-gray-800">{film.title}</h3>
        <p className="text-gray-600 text-sm">{film.year} | {film.director}</p>
        <p className="mt-2 text-sm text-gray-700">
          <span className="text-primary font-medium">Why this matches:</span> Perfect for {film.matchReason}
        </p>
      </div>
    </Card>
  );
}
