import { Heart, MapPin, Star, Trash2 } from 'lucide-react';

const FavoritesList = ({ favorites, onRemove, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-[var(--color-bg-sunken)] rounded-lg h-24" />
        ))}
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-[var(--color-bg-sunken)] rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-[var(--color-text-muted)]" />
        </div>
        <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
          No favorites yet
        </h3>
        <p className="text-[var(--color-text-secondary)]">
          Start exploring and save your favorite attractions!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--color-text-muted)]">
          {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
        </h3>
      </div>

      <div className="grid gap-4">
        {favorites.map((favorite) => (
          <div
            key={favorite.attractionId}
            className="flex items-center gap-4 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:shadow-md transition-shadow"
          >
            {/* Image */}
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-[var(--color-bg-sunken)] flex-shrink-0">
              {favorite.image ? (
                <img
                  src={favorite.image}
                  alt={favorite.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--color-brand-primary)]/10">
                  <MapPin className="w-8 h-8 text-[var(--color-brand-primary)]" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[var(--color-text-primary)] truncate">
                {favorite.name}
              </h4>
              {favorite.location && (
                <p className="text-sm text-[var(--color-text-secondary)] flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {favorite.location}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                {favorite.category && (
                  <span className="text-xs px-2 py-0.5 bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] rounded-full">
                    {favorite.category}
                  </span>
                )}
                {favorite.rating && (
                  <span className="text-sm text-[var(--color-text-secondary)] flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {favorite.rating}
                  </span>
                )}
              </div>
            </div>

            {/* Remove Button */}
            <button
              onClick={() => onRemove(favorite.attractionId)}
              className="p-2 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
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
