import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CoffeeShop, FilterCategory, BrandFilter, QuickFilter } from '../models/coffee-shop.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CoffeeDataService {
  private http = inject(HttpClient);
  public apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  // Default initial coordinates (Jakarta Pusat/Selatan)
  public defaultLocation = {
    lat: -6.2285,
    lng: 106.8115,
  };

  constructor() {}

  /**
   * Fetch REAL coffee shop data from Express + Supabase backend API (http://localhost:3000/api/coffeeshops)
   */
  public async getNearbyShopsFromApi(
    userLat: number,
    userLng: number,
    brand?: string,
    search?: string,
    radius: number = 8000
  ): Promise<CoffeeShop[]> {
    try {
      let url = `${this.apiUrl}/coffeeshops?lat=${userLat}&lng=${userLng}&radius=${radius}`;
      if (brand && brand !== 'all') {
        url += `&brand=${encodeURIComponent(brand)}`;
      }
      if (search && search.trim() !== '') {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const res = await firstValueFrom(
        this.http.get<{ success: boolean; data: any[]; count: number }>(url)
      );

      if (res && res.success && Array.isArray(res.data)) {
        return res.data.map((item) => this.mapApiToCoffeeShop(item));
      }

      return [];
    } catch (error) {
      console.error('❌ Gagal mengambil data dari Backend API (http://localhost:3000):', error);
      return [];
    }
  }

  /**
   * Filter in-memory coffee shops based on Brand and Quick/Secondary criteria
   */
  public filterShops(
    shops: CoffeeShop[],
    brandFilter: BrandFilter | string = 'all',
    quickFilter: QuickFilter | string = 'all'
  ): CoffeeShop[] {
    let result = [...shops];

    // 1. Filter by Brand
    if (brandFilter && brandFilter !== 'all') {
      result = result.filter((s) => s.brand === brandFilter);
    }

    // 2. Filter / Sort by Quick Filter criteria
    switch (quickFilter) {
      case 'nearby': {
        const within3km = result.filter((s) => (s.distance ?? 99999) <= 3000);
        if (within3km.length >= 10) {
          result = within3km;
        } else {
          const within5km = result.filter((s) => (s.distance ?? 99999) <= 5000);
          result = within5km.length > 0 ? within5km : result.slice(0, 20);
        }
        result.sort((a, b) => (a.distance ?? 99999) - (b.distance ?? 99999));
        break;
      }
      case 'open':
        result = result.filter((s) => s.isOpen);
        break;
      case '24hours':
        result = result.filter((s) => {
          const h = (s.openHours || '').toLowerCase();
          return h.includes('24 jam') || h.includes('24h') || h.includes('00:00 - 24:00');
        });
        break;
      case 'rating':
        result = result.filter((s) => s.rating >= 4.8);
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'promo':
        result = result.filter((s) => !!s.promo);
        break;
      case 'wfc':
        result = result.filter((s) => s.amenities?.wifi && s.amenities?.sockets);
        break;
      case 'all':
      default:
        result.sort((a, b) => (a.distance ?? 99999) - (b.distance ?? 99999));
        break;
    }

    return result;
  }

  /**
   * Normalize database fields into the standard CoffeeShop model
   */
  private mapApiToCoffeeShop(item: any): CoffeeShop {
    let signaturesArray: string[] = [];
    if (Array.isArray(item.signatures)) {
      signaturesArray = item.signatures;
    } else if (typeof item.signatures === 'string' && item.signatures.trim()) {
      try {
        signaturesArray = JSON.parse(item.signatures);
      } catch {
        signaturesArray = item.signatures.split(',').map((s: string) => s.trim());
      }
    }

    let amenitiesObj = {
      wifi: true,
      wifiSpeed: '50 Mbps',
      sockets: true,
      outdoor: true,
      ac: true,
      parking: true,
      musholla: true,
      driveThru: false,
    };

    if (item.amenities) {
      if (typeof item.amenities === 'object') {
        amenitiesObj = { ...amenitiesObj, ...item.amenities };
      } else if (typeof item.amenities === 'string') {
        try {
          amenitiesObj = { ...amenitiesObj, ...JSON.parse(item.amenities) };
        } catch {
          // ignore parse error
        }
      }
    }

    let menuArray: any[] = [];
    if (Array.isArray(item.menu_highlights)) {
      menuArray = item.menu_highlights;
    } else if (Array.isArray(item.menuHighlights)) {
      menuArray = item.menuHighlights;
    } else if (typeof item.menu_highlights === 'string' && item.menu_highlights.trim()) {
      try {
        menuArray = JSON.parse(item.menu_highlights);
      } catch {
        menuArray = [];
      }
    }

    return {
      id: String(item.id),
      name: item.name,
      brand: item.brand,
      brandLabel: item.brand_label || item.brandLabel || item.name,
      brandColor: item.brand_color || item.brandColor || '#8B3A0F',
      brandTextColor: item.brand_text_color || item.brandTextColor || '#FFFFFF',
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude),
      address: item.address || 'Alamat tidak tersedia',
      district: item.district || '',
      rating: parseFloat(item.rating) || 4.5,
      reviewsCount: parseInt(item.reviews_count || item.reviewsCount || 100, 10),
      priceRange: item.price_range || item.priceRange || 'Rp 15.000 - Rp 35.000',
      priceLevel: parseInt(item.price_level || item.priceLevel || 1, 10),
      isOpen: item.is_open !== undefined ? Boolean(item.is_open) : (item.isOpen !== undefined ? Boolean(item.isOpen) : true),
      openHours: item.open_hours || item.openHours || '07:00 - 22:00',
      signatures: signaturesArray,
      amenities: amenitiesObj,
      promo: item.promo || undefined,
      image: item.image || 'assets/images/coffee_hero.jpg',
      phone: item.phone || undefined,
      instagram: item.instagram || undefined,
      googleMapsUrl: item.google_maps_url || item.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`,
      distance: item.distance !== undefined ? Math.round(item.distance) : undefined,
      distanceText: item.distanceText || (item.distance ? `${Math.round(item.distance)} m` : undefined),
      walkingTimeText: item.walkingTimeText || undefined,
      drivingTimeText: item.drivingTimeText || undefined,
      menuHighlights: menuArray,
    };
  }
}
