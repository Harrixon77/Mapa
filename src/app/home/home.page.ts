import { AfterViewInit, Component, signal, inject} from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonFab, IonFabButton } from '@ionic/angular';
import  * as  L from "leaflet";
//import { map } from 'rxjs/internal/operators/map';
import { Geolocation } from '@capacitor/geolocation';
import { PhotoService } from '../services/photo';

interface PuntosDeInteres {
  id : string;
  nombre: string;
  typo: 'Parque' | 'Museo' | 'CentroComercial' | 'Universidad' | 'Estadio' | 'Planetario' | 'Biblioteca';
  coordenadas: [latitude: number, longitude: number];
}


   const Puntos: PuntosDeInteres[] = [
  {
    id: '1',
    nombre: 'Plaza de Bolívar',
    typo: 'Parque',
    coordenadas: [4.5981, -74.0758]
  },
  {
    id: '2',
    nombre: 'Museo del Oro',
    typo: 'Museo',
    coordenadas: [4.6010, -74.0721]
  },
  {
    id: '3',
    nombre: 'Monserrate',
    typo: 'Parque',
    coordenadas: [4.6050, -74.0550]
  },
  {
    id: '4',
    nombre: 'Museo Nacional de Colombia',
    typo: 'Museo',
    coordenadas: [4.6150, -74.0680]
  },
  {
    id: '5',
    nombre: 'Parque Nacional',
    typo: 'Parque',
    coordenadas: [4.6250, -74.0630]
  },
  {
    id: '6',  
    nombre: 'Parque de la Independencia',
    typo: 'Parque',
    coordenadas: [4.6135, -74.0695]
  },
  {
    id: '7',
    nombre: 'Planetario de Bogotá',
    typo: 'Planetario',
    coordenadas: [4.6138, -74.0695]
  },
  {
    id: '8',
    nombre: 'Torre Colpatria',
    typo: 'CentroComercial',
    coordenadas: [4.6102, -74.0700]
  },
  {
    id: '9',
    nombre: 'Biblioteca Luis Ángel Arango',
    typo: 'Biblioteca',
    coordenadas: [4.5965, -74.0735]
  },
  {
    id: '10',
    nombre: 'Chorro de Quevedo',
    typo: 'Parque',
    coordenadas: [4.5970, -74.0695]
  },
  {
    id: '11',
    nombre: 'Universidad Nacional de Colombia',
    typo: 'Universidad',
    coordenadas: [4.6380, -74.0840]
  },
  {
    id: '12',
    nombre: 'Estadio Nemesio Camacho El Campín',
    typo: 'Estadio',
    coordenadas: [4.6450, -74.0770]
  },
  {
    id: '13',
    nombre: 'Parque Simón Bolívar',
    typo: 'Parque',
    coordenadas: [4.6580, -74.0940]
  },
  {
    id: '14',
    nombre: 'Jardín Botánico de Bogotá',
    typo: 'Parque',
    coordenadas: [4.6680, -74.1000]
  },
  {
    id: '15',
    nombre: 'Centro Comercial Gran Estación',
    typo: 'CentroComercial',
    coordenadas: [4.6470, -74.1020]
  },
  {
    id: '16',
    nombre: 'Centro Comercial Andino',
    typo: 'CentroComercial',
    coordenadas: [4.6660, -74.0540]
  },
  {
    id: '17',
    nombre: 'Parque de la 93',
    typo: 'Parque',
    coordenadas: [4.6760, -74.0480]
  },
  {
    id: '18',
    nombre: 'Unicentro Bogotá',
    typo: 'CentroComercial',
    coordenadas: [4.7020, -74.0410]
  },
  {
    id: '19',
    nombre: 'Usaquén',
    typo: 'Parque',
    coordenadas: [4.6950, -74.0300]
  },
  {
    id: '20',
    nombre: 'Corferias',
    typo: 'CentroComercial',
    coordenadas: [4.6320, -74.0910]
  }
];


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonFab, IonFabButton],
})
export class HomePage implements AfterViewInit {
  private photoService = inject(PhotoService);
  puntoSeleccionado = signal<PuntosDeInteres | null>(null);
  fotoActual = signal<string | undefined>(undefined);

  private map !: L.Map ;
  private ubicacionUsuario!: {latitude: number, longitude: number};
  private rutaActual?: L.Polyline;     
  private MarcadorUsuario?: L.Marker; // Marcador del usuario
  
  private IconoUsuario = L.icon({
    iconUrl: 'assets/icon/person.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  private IconoPorTipo: Record<string,L.Icon>={

    Parque: L.icon({
      iconUrl: 'assets/icon/1.png',
      iconSize: [40, 40],
      iconAnchor: [16, 32],
    popupAnchor: [0, -32]
    }),
      Biblioteca: L.icon({
      iconUrl: 'assets/icon/1.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    popupAnchor: [0, -32]
      }),
      CentroComercial: L.icon({
      iconUrl: 'assets/icon/1.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    popupAnchor: [0, -32]
      }),
      Universidad: L.icon({
      iconUrl: 'assets/icon/1.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    popupAnchor: [0, -32]
      }),
      Museo: L.icon({
      iconUrl: 'assets/icon/1.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    popupAnchor: [0, -32]
      }),
      Planetario: L.icon({
      iconUrl: 'assets/icon/1.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    popupAnchor: [0, -32]
      }),
      Estadio: L.icon({
      iconUrl: 'assets/icon/1.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    popupAnchor: [0, -32]
      


    }),
  };

  constructor() {}
  ngAfterViewInit(): void {
    this.punto();
  }


  async punto () {
  const point = await Geolocation.getCurrentPosition();
  const{ latitude, longitude } = point.coords;
  this.ubicacionUsuario = { latitude, longitude };

  this.map = L.map('map').setView([latitude, longitude], 17);
  
  

    /*this.map =  L.map('map').setView([4.60971, -74.08175], 16);*/
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(this.map);

  this.MarcadorUsuario= L.marker([latitude, longitude], { icon: this.IconoUsuario })
    .addTo(this.map)
    .bindPopup('AQUI ANDO YO')
    .openPopup();


    Puntos.forEach((p) => { 
      const distancia = this.calcularDistancia(latitude, longitude, p.coordenadas[0], p.coordenadas[1]);
      const distanciaTexto = distancia <1000 ? `${distancia.toFixed(0)} m` : `${(distancia / 1000).toFixed(2)} km`;
    

      const marker = L.marker(p.coordenadas as L.LatLngExpression, { icon: this.IconoPorTipo[p.typo] });
      marker.addTo(this.map);
      marker.bindPopup(`${p.nombre}<br>Distancia: ${distanciaTexto}`);
      
//AYUDO IA+
      marker.on('click', () => {
  this.seleccionarPunto(p);                          // <- NUEVO: abre el panel
  this.trazarRuta(p.coordenadas[0], p.coordenadas[1]); // lo que ya tenías
});
//FIN IA +
    });

  
    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);

  }
//AYUDA IA +
  seleccionarPunto(p: PuntosDeInteres) {
  this.puntoSeleccionado.set(p);
  this.fotoActual.set(this.photoService.getPhoto(p.id)); // busca en el "casillero"
}

async tomarFoto() {
  const punto = this.puntoSeleccionado();
  if (!punto) return;

  const foto = await this.photoService.takePhoto(punto.id);
  if (foto) {
    this.fotoActual.set(foto);
  }
}

cerrarPanel() {
  this.puntoSeleccionado.set(null);
}
// TERMINA AYUDA IA +
async centrarEnMiUbicacion() {
  try {
    const { coords } = await Geolocation.getCurrentPosition();

    this.ubicacionUsuario = { latitude: coords.latitude, longitude: coords.longitude };

    const posicion = L.latLng(coords.latitude, coords.longitude);
    this.MarcadorUsuario?.setLatLng(posicion);
    this.map.flyTo(posicion, 17);
  } catch (error) {
    console.error('No se pudo obtener la ubicación:', error);
  }
}

  private calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180; // Convertir a radianes
    const φ2 = lat2 * Math.PI / 180; // Convertir a radianes
    const Δφ = (lat2 - lat1) * Math.PI / 180; // Diferencia de latitud en radianes
    const Δλ = (lon2 - lon1) * Math.PI / 180; // Diferencia de longitud en radianes

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  }
    private async obtenerRuta(origenLat: number, origenLng: number, destinoLat: number, destinoLng: number): Promise<L.LatLng[]> {
    const url = `https://router.project-osrm.org/route/v1/foot/${origenLng},${origenLat};${destinoLng},${destinoLat}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No se encontró ruta');
    }

    return data.routes[0].geometry.coordinates.map(
      (coord: [number, number]) => L.latLng(coord[1], coord[0])
    );
  }

  async trazarRuta(destinoLat: number, destinoLng: number) {
    try {
      const coordenadas = await this.obtenerRuta(
        this.ubicacionUsuario.latitude,
        this.ubicacionUsuario.longitude,
        destinoLat,
        destinoLng
      );

      if (this.rutaActual) {
        this.map.removeLayer(this.rutaActual);
      }

      this.rutaActual = L.polyline(coordenadas, {
        color: '#3388ff',
        weight: 5,
        opacity: 0.8
      }).addTo(this.map);

      this.map.fitBounds(this.rutaActual.getBounds(), { padding: [50, 50] });

    } catch (error) {
      console.error('Error trazando ruta:', error);
    }
  }
}


/*
import { AfterViewInit, Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular';
import * as L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class HomePage implements AfterViewInit {

  private map!: L.Map;

  constructor() {}

  ngAfterViewInit(): void {
    this.Initmap();
  }

  async Initmap() {

    this.map = L.map('map').setView([4.60971, -74.08175], 12);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

   const puntos = [
  {
    nombre: 'Plaza de Bolívar',
    coordenadas: [4.5981, -74.0758]
  },
  {
    nombre: 'Museo del Oro',
    coordenadas: [4.6010, -74.0721]
  },
  {
    nombre: 'Monserrate',
    coordenadas: [4.6050, -74.0550]
  },
  {
    nombre: 'Museo Nacional de Colombia',
    coordenadas: [4.6150, -74.0680]
  },
  {
    nombre: 'Parque Nacional',
    coordenadas: [4.6250, -74.0630]
  },
  {
    nombre: 'Parque de la Independencia',
    coordenadas: [4.6135, -74.0695]
  },
  {
    nombre: 'Planetario de Bogotá',
    coordenadas: [4.6138, -74.0695]
  },
  {
    nombre: 'Torre Colpatria',
    coordenadas: [4.6102, -74.0700]
  },
  {
    nombre: 'Biblioteca Luis Ángel Arango',
    coordenadas: [4.5965, -74.0735]
  },
  {
    nombre: 'Chorro de Quevedo',
    coordenadas: [4.5970, -74.0695]
  },
  {
    nombre: 'Universidad Nacional de Colombia',
    coordenadas: [4.6380, -74.0840]
  },
  {
    nombre: 'Estadio Nemesio Camacho El Campín',
    coordenadas: [4.6450, -74.0770]
  },
  {
    nombre: 'Parque Simón Bolívar',
    coordenadas: [4.6580, -74.0940]
  },
  {
    nombre: 'Jardín Botánico de Bogotá',
    coordenadas: [4.6680, -74.1000]
  },
  {
    nombre: 'Centro Comercial Gran Estación',
    coordenadas: [4.6470, -74.1020]
  },
  {
    nombre: 'Centro Comercial Andino',
    coordenadas: [4.6660, -74.0540]
  },
  {
    nombre: 'Parque de la 93',
    coordenadas: [4.6760, -74.0480]
  },
  {
    nombre: 'Unicentro Bogotá',
    coordenadas: [4.7020, -74.0410]
  },
  {
    nombre: 'Usaquén',
    coordenadas: [4.6950, -74.0300]
  },
  {
    nombre: 'Corferias',
    coordenadas: [4.6320, -74.0910]
  }
];

  puntos.forEach((punto) => {

  L.marker(punto.coordenadas as L.LatLngExpression)
    .addTo(this.map)
    .bindPopup(`<b>${punto.nombre}</b>`);

});

    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);
  }

  async punto() {
    const point = await Geolocation.getCurrentPosition();
    console.log(point);
  }
} */