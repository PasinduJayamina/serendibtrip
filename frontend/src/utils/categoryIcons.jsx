import {
  MapPinIcon,
  CameraIcon,
  BuildingLibraryIcon,
  GlobeAsiaAustraliaIcon,
  SparklesIcon,
  ShoppingBagIcon,
  MusicalNoteIcon,
  HeartIcon,
  SunIcon,
  MoonIcon,
  TruckIcon,
  HomeIcon,
  AcademicCapIcon,
  BeakerIcon,
  BoltIcon,
  FireIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

// Category configurations with icons and colors
export const categoryConfig = {
  culture: {
    icon: BuildingLibraryIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
    label: 'Culture',
  },
  nature: {
    icon: GlobeAsiaAustraliaIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    label: 'Nature',
  },
  food: {
    icon: FireIcon,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    label: 'Food',
  },
  adventure: {
    icon: BoltIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    label: 'Adventure',
  },
  relaxation: {
    icon: SparklesIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    label: 'Relaxation',
  },
  shopping: {
    icon: ShoppingBagIcon,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    borderColor: 'border-pink-300',
    label: 'Shopping',
  },
  entertainment: {
    icon: MusicalNoteIcon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-300',
    label: 'Entertainment',
  },
  photography: {
    icon: CameraIcon,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    borderColor: 'border-cyan-300',
    label: 'Photography',
  },
  travel: {
    icon: TruckIcon,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    label: 'Travel',
  },
  accommodation: {
    icon: HomeIcon,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    label: 'Accommodation',
  },
  wellness: {
    icon: HeartIcon,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
    borderColor: 'border-rose-300',
    label: 'Wellness',
  },
  education: {
    icon: AcademicCapIcon,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    borderColor: 'border-teal-300',
    label: 'Education',
  },
  default: {
    icon: MapPinIcon,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    borderColor: 'border-teal-300',
    label: 'Activity',
  },
};

// Get category config with fallback to default
export const getCategoryConfig = (category) => {
  const normalizedCategory = category?.toLowerCase().trim() || 'default';
  return categoryConfig[normalizedCategory] || categoryConfig.default;
};

// Category icon component
export const CategoryIcon = ({ category, size = 'md', showLabel = false }) => {
  const config = getCategoryConfig(category);
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${config.color}`}>
      <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
        <IconComponent className={sizeClasses[size]} />
      </div>
      {showLabel && <span className="text-sm font-medium">{config.label}</span>}
    </div>
  );
};

// Category badge component
export const CategoryBadge = ({ category }) => {
  const config = getCategoryConfig(category);
  const IconComponent = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}
    >
      <IconComponent className="w-3 h-3" />
      {config.label}
    </span>
  );
};

// Format time to 12-hour format
export const formatTime = (time) => {
  if (!time) return '';

  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Format currency
export const formatCurrency = (amount, currency = 'LKR') => {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Get day of week short form
export const getDayOfWeek = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

// Weather icon mapping
export const getWeatherIcon = (condition) => {
  const weatherIcons = {
    sunny: SunIcon,
    clear: SunIcon,
    cloudy: MoonIcon,
    rain: BeakerIcon,
    default: SunIcon,
  };

  const normalizedCondition = condition?.toLowerCase() || 'default';
  return weatherIcons[normalizedCondition] || weatherIcons.default;
};

export default categoryConfig;
