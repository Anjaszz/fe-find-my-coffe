export interface MenuItem {
  name: string;
  price: number;
  description?: string;
  tag?: string;
  isPopular?: boolean;
}

export interface CoffeeAmenities {
  wifi: boolean;
  wifiSpeed?: string;
  sockets: boolean;
  outdoor: boolean;
  ac: boolean;
  parking: boolean;
  musholla: boolean;
  driveThru: boolean;
}

export interface CoffeeShop {
  id: string;
  name: string;
  brand: 'kopi_kenangan' | 'tuku' | 'fore' | 'tomoro' | 'janji_jiwa' | 'starbucks' | 'point' | 'artisan';
  brandLabel: string;
  brandColor: string;
  brandTextColor: string;
  latitude: number;
  longitude: number;
  address: string;
  district: string;
  rating: number;
  reviewsCount: number;
  priceRange: string;
  priceLevel: number; // 1: <20k, 2: 20-40k, 3: >40k
  isOpen: boolean;
  openHours: string;
  signatures: string[];
  amenities: CoffeeAmenities;
  promo?: string;
  image: string;
  phone?: string;
  instagram?: string;
  googleMapsUrl: string;
  distance?: number; // meters
  distanceText?: string;
  walkingTimeText?: string;
  drivingTimeText?: string;
  menuHighlights: MenuItem[];
}

export type BrandFilter =
  | 'all'
  | 'kopi_kenangan'
  | 'tuku'
  | 'fore'
  | 'tomoro'
  | 'janji_jiwa';

export type QuickFilter =
  | 'all'
  | 'nearby'
  | 'open'
  | '24hours'
  | 'rating'
  | 'promo'
  | 'wfc';

export type FilterCategory = BrandFilter | QuickFilter;
