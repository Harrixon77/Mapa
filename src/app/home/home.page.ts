import { AfterViewInit, Component, computed, effect, inject, signal } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonModal, IonSearchbar, ToastController,
} from '@ionic/angular';
import * as L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';
import { MAX_FOTOS, PhotoService, ResultadoFoto } from '../services/photo';
import { PlacesService } from '../services/places.service';
import { CATEGORIAS, Categoria, INFO_CATEGORIA, Lugar } from '../models/lugar';
import { Capacitor } from '@capacitor/core';

type Filtro = 'todos' | 'favoritos' | Categoria;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonModal, IonSearchbar],
})
export class HomePage implements AfterViewInit {
  private photoService = inject(PhotoService);
  private toast = inject(ToastController);
  places = inject(PlacesService);

  // ----- Mapa -----
  private map!: L.Map;
  private capaMarcadores = L.layerGroup();
  private marcadorUsuario?: L.Marker;
  private marcadorTemporal?: L.CircleMarker;
  private rutaActual?: L.Polyline;
  private mapaListo = signal(false);
  private ubicacion = signal({ latitude: 4.60971, longitude: -74.08175 }); // Bogotá por defecto

  private IconoUsuario = L.icon({
    iconUrl: 'assets/icon/person.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  // ----- Estado de la pantalla -----
  puntoSeleccionado = signal<Lugar | null>(null);
  filtro = signal<Filtro>('todos');
  listaAbierta = signal(false);
  busqueda = signal('');

  // Formulario "nuevo lugar"
  nuevoCoord = signal<[number, number] | null>(null);
  nuevoNombre = signal('');
  nuevoTipo = signal<Categoria>('Cafe');

  maxFotos = MAX_FOTOS;
  categorias = CATEGORIAS;
  info = INFO_CATEGORIA;

  // ----- Valores calculados (se actualizan solos) -----
  fotosActuales = computed(() => {
    const punto = this.puntoSeleccionado();
    return punto ? this.photoService.getPhotos(punto.id) : [];
  });

  // Chips: Todos, Favoritos y solo las categorías que tengan lugares
  chips = computed<{ clave: Filtro; etiqueta: string }[]>(() => {
    const usadas = new Set(this.places.todos().map((l) => l.typo));
    return [
      { clave: 'todos', etiqueta: 'Todos' },
      { clave: 'favoritos', etiqueta: '⭐ Favoritos' },
      ...CATEGORIAS.filter((c) => usadas.has(c)).map((c) => ({
        clave: c as Filtro,
        etiqueta: `${INFO_CATEGORIA[c].emoji} ${INFO_CATEGORIA[c].plural}`,
      })),
    ];
  });

  lugaresVisibles = computed(() => {
    const f = this.filtro();
    const todos = this.places.todos();
    if (f === 'todos') return todos;
    if (f === 'favoritos') {
      const favs = this.places.favoritos();
      return todos.filter((l) => favs.includes(l.id));
    }
    return todos.filter((l) => l.typo === f);
  });

  // Lista del modal: filtrada por búsqueda y ordenada por cercanía
  listaFiltrada = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const { latitude, longitude } = this.ubicacion();
    return this.lugaresVisibles()
      .filter((l) => l.nombre.toLowerCase().includes(q))
      .map((l) => ({
        lugar: l,
        metros: this.calcularDistancia(latitude, longitude, l.coordenadas[0], l.coordenadas[1]),
      }))
      .sort((a, b) => a.metros - b.metros);
  });

  distanciaPanel = computed(() => {
    const p = this.puntoSeleccionado();
    if (!p) return '';
    const { latitude, longitude } = this.ubicacion();
    return this.formatear(this.calcularDistancia(latitude, longitude, p.coordenadas[0], p.coordenadas[1]));
  });

  constructor() {
    // Cada vez que cambian los lugares visibles o los favoritos, se redibujan los marcadores
    effect(() => {
      if (!this.mapaListo()) return;
      this.dibujarMarcadores(this.lugaresVisibles(), this.places.favoritos());
    });
  }

  ngAfterViewInit(): void {
    this.iniciarMapa();
  }

  // =============== MAPA ===============
  async iniciarMapa() {
    // El mapa se crea primero, sin depender del GPS
    this.map = L.map('map', { zoomControl: false }).setView([4.60971, -74.08175], 15);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);

    this.capaMarcadores.addTo(this.map);
    this.map.on('click', (e: L.LeafletMouseEvent) => this.alTocarMapa(e));
    this.mapaListo.set(true);

    setTimeout(() => this.map.invalidateSize(), 100);

    await this.centrarEnMiUbicacion();

    if (!localStorage.getItem('pista_vista')) {
      localStorage.setItem('pista_vista', '1');
      this.avisar('Toca cualquier parte del mapa para agregar un lugar');
    }
  }

  private crearIcono(l: Lugar, favorito: boolean): L.DivIcon {
    const borde = favorito ? '#ffb400' : '#ffffff';
    return L.divIcon({
      className: '',
      html: `<div style="width:38px;height:38px;border-radius:50%;background:#fff;border:3px solid ${borde};box-shadow:0 3px 10px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;font-size:20px;">${INFO_CATEGORIA[l.typo].emoji}</div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
  }

  private dibujarMarcadores(lugares: Lugar[], favoritos: string[]) {
    this.capaMarcadores.clearLayers();

    lugares.forEach((l) => {
      const marker = L.marker(l.coordenadas, {
        icon: this.crearIcono(l, favoritos.includes(l.id)),
        title: l.nombre,
      });
      marker.on('click', () => this.seleccionarLugar(l));
      this.capaMarcadores.addLayer(marker);
    });
  }

  async centrarEnMiUbicacion() {
    try {
      if (Capacitor.isNativePlatform()) {
  let permiso = await Geolocation.checkPermissions();

  if (permiso.location !== 'granted') {
    permiso = await Geolocation.requestPermissions();
  }

  if (permiso.location !== 'granted') {
    this.avisar('Sin permiso de ubicación. Actívalo en Ajustes de la app.');
    return;
  }
}
      const { coords } = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      const pos = L.latLng(coords.latitude, coords.longitude);
      this.ubicacion.set({ latitude: coords.latitude, longitude: coords.longitude });

      if (this.marcadorUsuario) {
        this.marcadorUsuario.setLatLng(pos);
      } else {
        this.marcadorUsuario = L.marker(pos, { icon: this.IconoUsuario }).addTo(this.map);
      }
      this.map.flyTo(pos, 16);
    } catch (error) {
      console.error('No se pudo obtener la ubicación:', error);
      this.avisar('No pude obtener tu ubicación. Revisa el GPS y los permisos.');
    }
  }

  // =============== SELECCIÓN Y PANEL ===============
  seleccionarLugar(l: Lugar) {
    this.listaAbierta.set(false);
    this.puntoSeleccionado.set(l);
    this.trazarRuta(l.coordenadas[0], l.coordenadas[1]);
  }

  cerrarPanel() {
    this.puntoSeleccionado.set(null);
    if (this.rutaActual) {
      this.map.removeLayer(this.rutaActual);
      this.rutaActual = undefined;
    }
  }

  alternarFavorito(id: string, evento?: Event) {
    evento?.stopPropagation(); // evita que el click también abra el lugar
    this.places.alternarFavorito(id);
  }

  eliminarLugar() {
    const p = this.puntoSeleccionado();
    if (!p?.propio) return;
    if (!confirm(`¿Eliminar "${p.nombre}" y sus fotos?`)) return;

    this.photoService.deleteAll(p.id);
    this.places.eliminar(p.id);
    this.cerrarPanel();
  }

  // ====AGREGAR LUGAR
  private alTocarMapa(e: L.LeafletMouseEvent) {
    // Si hay un panel abierto, el primer toque solo lo cierra
    if (this.puntoSeleccionado()) {
      this.cerrarPanel();
      return;
    }

    this.nuevoNombre.set('');
    this.nuevoTipo.set('Cafe');
    this.nuevoCoord.set([e.latlng.lat, e.latlng.lng]);

    this.marcadorTemporal?.remove();
    this.marcadorTemporal = L.circleMarker(e.latlng, {
      radius: 9, color: '#007aff', fillColor: '#007aff', fillOpacity: 0.5,
    }).addTo(this.map);
  }

  guardarNuevo() {
    const coord = this.nuevoCoord();
    const nombre = this.nuevoNombre().trim();
    if (!coord || !nombre) return;

    const lugar = this.places.agregar(nombre, this.nuevoTipo(), coord);
    this.cancelarNuevo();
    this.filtro.set('todos');
    this.seleccionarLugar(lugar);
  }

  cancelarNuevo() {
    this.nuevoCoord.set(null);
    this.marcadorTemporal?.remove();
    this.marcadorTemporal = undefined;
  }

  // =============== FOTOS ===============
  async tomarFoto() {
    const punto = this.puntoSeleccionado();
    if (!punto) return;
    this.avisarResultado(await this.photoService.takePhoto(punto.id));
  }

  async subirDeGaleria() {
    const punto = this.puntoSeleccionado();
    if (!punto) return;
    this.avisarResultado(await this.photoService.pickFromGallery(punto.id));
  }

  borrarFoto(index: number) {
    const punto = this.puntoSeleccionado();
    if (punto) this.photoService.deletePhoto(punto.id, index);
  }

  private avisarResultado(r: ResultadoFoto) {
    if (r === 'limite') this.avisar(`Máximo ${MAX_FOTOS} fotos por lugar`);
    if (r === 'sin-espacio') this.avisar('No hay espacio para guardar más fotos');
    if (r === 'sin-permiso') this.avisar('Sin permiso. Actívalo en Ajustes → Apps → tu app → Permisos');
if (r === 'error') this.avisar(`Error: ${this.photoService.ultimoError}`);
  }

  private async avisar(message: string) {
    const t = await this.toast.create({ message, duration: 2200, position: 'top', color: 'dark' });
    await t.present();
  }

  // =============== DISTANCIA Y RUTAS ===============
  formatear(metros: number): string {
    return metros < 1000 ? `${metros.toFixed(0)} m` : `${(metros / 1000).toFixed(1)} km`;
  }

  private calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private async obtenerRuta(oLat: number, oLng: number, dLat: number, dLng: number): Promise<L.LatLng[]> {
    const url = `https://router.project-osrm.org/route/v1/foot/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) throw new Error('No se encontró ruta');

    return data.routes[0].geometry.coordinates.map(
      (c: [number, number]) => L.latLng(c[1], c[0])
    );
  }

  async trazarRuta(destinoLat: number, destinoLng: number) {
    try {
      const { latitude, longitude } = this.ubicacion();
      const coordenadas = await this.obtenerRuta(latitude, longitude, destinoLat, destinoLng);

      if (this.rutaActual) this.map.removeLayer(this.rutaActual);

      this.rutaActual = L.polyline(coordenadas, { color: '#007aff', weight: 5, opacity: 0.85 }).addTo(this.map);
      this.map.fitBounds(this.rutaActual.getBounds(), { padding: [60, 60] });
    } catch (error) {
      console.error('Error trazando ruta:', error);
      this.map.flyTo([destinoLat, destinoLng], 16); // plan B: al menos ir al lugar
    }
  }
}