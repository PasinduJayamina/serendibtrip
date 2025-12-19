import { Heart, MapPin, Star, Trash2 } from 'lucide-react';

const FavoritesList = ({ favorites, onRemove, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-24" />
        ))}
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No favorites yet
        </h3>
        <p className="text-gray-500">
          Start exploring and save your favorite attractions!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">
          {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
        </h3>
      </div>

      <div className="grid gap-4">
        {favorites.map((favorite) => (
          <div
            key={favorite.attractionId}
            className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            {/* Image */}
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {favorite.image ? (
                <img
                  src={favorite.image}
                  alt={favorite.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#208896]/20 to-[#208896]/10">
                  <MapPin className="w-8 h-8 text-[#208896]" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">
                {favorite.name}
              </h4>
              {favorite.location && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {favorite.location}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                {favorite.category && (
                  <span className="text-xs px-2 py-0.5 bg-[#208896]/10 text-[#208896] rounded-full">
                    {favorite.category}
                  </span>
                )}
                {favorite.rating && (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {favorite.rating}
                  </span>
                )}
              </div>
            </div>

            {/* Remove Button */}
            <button
              onClick={() => onRemove(favorite.attractionId)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove from favorites"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FavoritesList;
