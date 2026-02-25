import { Link, useLocation } from 'react-router-dom';
import { Home, Sparkles, Map as MapIcon, User } from 'lucide-react';
import { useUserStore } from '../../store/userStore';

/**
 * BottomTabBar — Mobile-only bottom navigation
 * 
 * Shown at ≤768px. Uses fixed positioning with iOS safe-area support.
 * Touch targets are ≥44px for accessibility.
 */

const tabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/recommendations', label: 'AI Picks', icon: Sparkles },
  { to: '/itinerary', label: 'Itinerary', icon: MapIcon },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function BottomTabBar() {
  const location = useLocation();
  const { isAuthenticated } = useUserStore();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[1100] glass border-t border-[var(--color-border)]"
      style={{ paddingBottom: 'var(--tab-safe-bottom)' }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          // Redirect unauthenticated users from profile to login
          const href = tab.to === '/profile' && !isAuthenticated ? '/login' : tab.to;
          const isActive = location.pathname === tab.to || 
            (tab.to === '/profile' && location.pathname === '/login');

          return (
            <Link
              key={tab.to}
              to={href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] px-2 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'text-[var(--color-brand-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <tab.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
