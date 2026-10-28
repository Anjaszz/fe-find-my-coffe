import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonIcon,
  IonModal,
  IonToast,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  locationOutline,
  navigateOutline,
  locateOutline,
  cafeOutline,
  star,
  timeOutline,
  closeOutline,
  callOutline,
  logoInstagram,
  shareSocialOutline,
  wifiOutline,
  flashOutline,
  carOutline,
  snowOutline,
  mapOutline,
  listOutline,
  copyOutline,
  checkmarkCircle,
  sparklesOutline,
  navigateCircleOutline,
  storefrontOutline,
  moonOutline,
  optionsOutline,
} from 'ionicons/icons';
import * as L from 'leaflet';
import { CoffeeDataService } from '../services/coffee-data.service';
import { CoffeeShop, FilterCategory, BrandFilter, QuickFilter } from '../models/coffee-shop.model';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonIcon,
    IonModal,
    IonToast,
  ],
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  private coffeeService = inject(CoffeeDataService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  public map: L.Map | null = null;
  public userMarker: L.Marker | null = null;
  public shopMarkers: Map<string, L.Marker> = new Map();

  public userCoords = {
    lat: this.coffeeService.defaultLocation.lat,
    lng: this.coffeeService.defaultLocation.lng,
  };

  public isGpsActive = false;
  public isLocating = false;
  public selectedBrand: BrandFilter = 'all';
  public selectedQuickFilter: QuickFilter = 'nearby';
  public activeView: 'map' | 'list' = 'map';

  public isLoading = false;
  public allShops: CoffeeShop[] = [];
  public displayedShops: CoffeeShop[] = [];
  public selectedShop: CoffeeShop | null = null;

  public isDetailModalOpen = false;
  public isToastOpen = false;
  public toastMessage = '';

  public brandFilters: { id: BrandFilter; label: string; icon?: string; badgeColor?: string; logo?: string }[] = [
    { id: 'all', label: 'Semua Brand', icon: 'cafe-outline' },
    { id: 'kopi_kenangan', label: 'Kopi Kenangan', badgeColor: '#8B0000', logo: 'assets/images/kopken.png' },
    { id: 'tuku', label: 'Toko Kopi Tuku', badgeColor: '#6F4E37', logo: 'assets/images/tuku.webp' },
    { id: 'fore', label: 'Fore Coffee', badgeColor: '#005A36', logo: 'assets/images/fore.webp' },
    { id: 'tomoro', label: 'Tomoro Coffee', badgeColor: '#F25C05', logo: 'assets/images/tomoro.jpg' },
    { id: 'janji_jiwa', label: 'Janji Jiwa', badgeColor: '#4A152B', logo: 'assets/images/janjiw.png' },
  ];

  public quickFilters: { id: QuickFilter; label: string; icon: string }[] = [
    { id: 'nearby', label: 'Terdekat (<3 km)', icon: 'navigate-outline' },
    { id: '24hours', label: 'Buka 24 Jam 🌙', icon: 'moon-outline' },
    { id: 'open', label: 'Buka Sekarang', icon: 'time-outline' },
    { id: 'rating', label: 'Rating 4.8+ ⭐', icon: 'star' },
    { id: 'promo', label: 'Ada Promo ⚡', icon: 'sparkles-outline' },
    { id: 'all', label: 'Semua Status', icon: 'options-outline' },
  ];

  public getBrandLogo(brand: string): string {
    switch (brand) {
      case 'kopi_kenangan':
        return 'assets/images/kopken.png';
      case 'tuku':
        return 'assets/images/tuku.webp';
      case 'fore':
        return 'assets/images/fore.webp';
      case 'tomoro':
        return 'assets/images/tomoro.jpg';
      case 'janji_jiwa':
        return 'assets/images/janjiw.png';
      default:
        return 'assets/images/kopken.png';
    }
  }

  constructor() {
    addIcons({
      searchOutline,
      locationOutline,
      navigateOutline,
      locateOutline,
      cafeOutline,
      star,
      timeOutline,
      closeOutline,
      callOutline,
      logoInstagram,
      shareSocialOutline,
      wifiOutline,
      flashOutline,
      carOutline,
      snowOutline,
      mapOutline,
      listOutline,
      copyOutline,
      checkmarkCircle,
      sparklesOutline,
      navigateCircleOutline,
      storefrontOutline,
      moonOutline,
      optionsOutline,
    });
  }

  ngOnInit() {
    this.refreshShops();
  }

  ngAfterViewInit() {
    // Small delay to ensure DOM is ready and styled
    setTimeout(() => {
      this.initLeafletMap();
      this.requestUserLocation(false);
    }, 150);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  public async refreshShops() {
    this.isLoading = true;
    try {
      const apiShops = await this.coffeeService.getNearbyShopsFromApi(
        this.userCoords.lat,
        this.userCoords.lng
      );

      this.ngZone.run(() => {
        this.allShops = apiShops;
        this.applyFilters();
        this.isLoading = false;
        this.cdr.markForCheck();
      });
    } catch (err) {
      console.error('Error fetching shops from API:', err);
      this.ngZone.run(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      });
    }
  }

  public applyFilters() {
    this.displayedShops = this.coffeeService.filterShops(
      this.allShops,
      this.selectedBrand,
      this.selectedQuickFilter
    );

    // If active selectedShop is no longer in filtered list, reset selection
    if (this.selectedShop && !this.displayedShops.find((s) => s.id === this.selectedShop?.id)) {
      this.selectedShop = null;
    }

    if (this.map) {
      this.renderMarkers();
    }
  }

  public setBrandFilter(brand: BrandFilter) {
    if (this.selectedBrand === brand && brand !== 'all') {
      this.selectedBrand = 'all';
    } else {
      this.selectedBrand = brand;
    }
    this.applyFilters();
  }

  public setQuickFilter(filter: QuickFilter) {
    if (this.selectedQuickFilter === filter && filter !== 'all') {
      this.selectedQuickFilter = 'all';
    } else {
      this.selectedQuickFilter = filter;
    }
    this.applyFilters();
  }

  public resetAllFilters() {
    this.selectedBrand = 'all';
    this.selectedQuickFilter = 'nearby';
    this.applyFilters();
  }

  private initLeafletMap() {
    if (!this.mapContainer?.nativeElement) return;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [this.userCoords.lat, this.userCoords.lng],
      zoom: 14,
      zoomControl: false,
    });

    // Clean OpenStreetMap tiles (100% free, no API key, reliable)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    // Click anywhere on map to deselect
    this.map.on('click', (e: any) => {
      const target = e.originalEvent?.target as HTMLElement;
      if (!target?.closest('.coffee-marker-pin')) {
        this.ngZone.run(() => {
          this.selectedShop = null;
          this.updateMarkerSelection();
          this.cdr.markForCheck();
        });
      }
    });

    this.renderUserLocationMarker();
    this.renderMarkers();
  }

  public renderUserLocationMarker() {
    if (!this.map) return;

    if (this.userMarker) {
      this.userMarker.setLatLng([this.userCoords.lat, this.userCoords.lng]);
    } else {
      const userHtml = `
        <div class="user-location-marker" title="Lokasi Anda">
          <div class="pulse-circle"></div>
          <div class="dot-inner"></div>
        </div>
      `;

      const userIcon = L.divIcon({
        html: userHtml,
        className: 'user-pulse-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      this.userMarker = L.marker([this.userCoords.lat, this.userCoords.lng], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(this.map);
    }
  }

  public renderMarkers() {
    if (!this.map) return;

    // Remove old markers
    this.shopMarkers.forEach((marker) => marker.remove());
    this.shopMarkers.clear();

    this.displayedShops.forEach((shop) => {
      const isSelected = this.selectedShop?.id === shop.id;
      const marker = this.createShopMarker(shop, isSelected);
      marker.addTo(this.map!);
      this.shopMarkers.set(shop.id, marker);
    });
  }

  private createShopMarker(shop: CoffeeShop, isSelected: boolean): L.Marker {
    const icon = this.buildDivIcon(shop, isSelected);

    const marker = L.marker([shop.latitude, shop.longitude], {
      icon: icon,
      zIndexOffset: isSelected ? 500 : 100,
    });

    marker.on('click', (e: L.LeafletMouseEvent) => {
      if (e?.originalEvent) {
        e.originalEvent.stopPropagation();
      }
      this.ngZone.run(() => {
        this.selectShop(shop, false);
        this.openDetailModal(shop);
        this.cdr.markForCheck();
      });
    });

    return marker;
  }

  private buildDivIcon(shop: CoffeeShop, isSelected: boolean): L.DivIcon {
    const activeClass = isSelected ? 'is-active' : '';
    const logoUrl = this.getBrandLogo(shop.brand);
    const html = `
      <div class="coffee-marker-pin ${activeClass}">
        <div class="coffee-pin-body" style="background-color: ${shop.brandColor};">
          <img src="${logoUrl}" alt="${shop.brandLabel}" class="coffee-pin-logo" />
          <span class="shop-title">${shop.brandLabel}</span>
          <span style="font-size: 10px; opacity: 0.9; font-weight: 600;">${shop.distanceText || ''}</span>
        </div>
        <div class="coffee-pin-pointer" style="border-top-color: ${shop.brandColor};"></div>
      </div>
    `;

    return L.divIcon({
      html: html,
      className: 'custom-shop-icon',
      iconSize: [145, 46],
      iconAnchor: [72, 45],
    });
  }

  public selectShop(shop: CoffeeShop, panMap: boolean = true) {
    this.ngZone.run(() => {
      this.selectedShop = shop;
      this.updateMarkerSelection();
      this.cdr.markForCheck();

      if (panMap && this.map) {
        // Offset latitude slightly south so the pin sits comfortably above the bottom sheet
        const offsetLat = shop.latitude - 0.0035;
        this.map.flyTo([offsetLat, shop.longitude], 16, {
          duration: 0.8,
        });
      }
    });
  }

  private updateMarkerSelection() {
    this.shopMarkers.forEach((marker, id) => {
      const shop = this.allShops.find((s) => s.id === id);
      if (shop) {
        const isSelected = this.selectedShop?.id === id;
        marker.setIcon(this.buildDivIcon(shop, isSelected));
        marker.setZIndexOffset(isSelected ? 600 : 100);
      }
    });
  }

  public requestUserLocation(showNotice: boolean = true) {
    if (!navigator.geolocation) {
      if (showNotice) {
        this.showToast('Geolocation tidak didukung pada browser ini.');
      }
      return;
    }

    this.isLocating = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          this.isLocating = false;
          this.isGpsActive = true;
          this.userCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          this.renderUserLocationMarker();
          this.refreshShops();
          this.cdr.markForCheck();

          if (this.map) {
            this.map.flyTo([this.userCoords.lat, this.userCoords.lng], 15, {
              duration: 1.0,
            });
          }

          if (showNotice) {
            this.showToast('Lokasi GPS berhasil diperbarui!');
          }
        });
      },
      (error) => {
        this.ngZone.run(() => {
          this.isLocating = false;
          this.cdr.markForCheck();
          if (showNotice) {
            this.showToast('Menggunakan lokasi default (Senopati / SCBD Jakarta).');
          }
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  public zoomIn() {
    this.map?.zoomIn();
  }

  public zoomOut() {
    this.map?.zoomOut();
  }

  public openGoogleMaps(shop: CoffeeShop, event?: Event) {
    event?.stopPropagation();
    let url = shop.googleMapsUrl;
    if (!url || !url.startsWith('http')) {
      const query = shop.name ? encodeURIComponent(`${shop.name} ${shop.district || ''}`.trim()) : `${shop.latitude},${shop.longitude}`;
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    window.open(url, '_blank');
  }

  public openDetailModal(shop: CoffeeShop, event?: Event) {
    event?.stopPropagation();
    this.ngZone.run(() => {
      this.selectedShop = shop;
      this.isDetailModalOpen = true;
      this.cdr.markForCheck();
    });
  }

  public closeDetailModal() {
    this.ngZone.run(() => {
      this.isDetailModalOpen = false;
      this.cdr.markForCheck();
    });
  }

  public copyAddress(address: string, event?: Event) {
    event?.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(address);
      this.showToast('Alamat berhasil disalin ke clipboard!');
    }
  }

  public showToast(msg: string) {
    this.toastMessage = msg;
    this.isToastOpen = true;
  }

  public toggleView(view: 'map' | 'list') {
    this.activeView = view;
    if (view === 'map') {
      setTimeout(() => {
        this.map?.invalidateSize();
      }, 200);
    }
  }

  public getBrandInitials(brand: string): string {
    switch (brand) {
      case 'kopi_kenangan':
        return 'KK';
      case 'tuku':
        return 'TK';
      case 'fore':
        return 'FR';
      case 'tomoro':
        return 'TM';
      case 'janji_jiwa':
        return 'JJ';
      case 'point':
        return 'PC';
      case 'starbucks':
        return 'SB';
      default:
        return '☕';
    }
  }
}
