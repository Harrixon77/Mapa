import { Injectable, signal } from '@angular/core';
import { Camera } from '@capacitor/camera';

const CLAVE = 'fotos_por_punto';
export const MAX_FOTOS = 5;
export type ResultadoFoto = 'ok' | 'limite' | 'sin-espacio' | 'cancelado';

@Injectable({ providedIn: 'root' })
export class PhotoService {
  // Antes: { 'id': 'foto' }   Ahora: { 'id': ['foto1', 'foto2', ...] }
  private photos = signal<Record<string, string[]>>(this.cargar());

  getPhotos(pointId: string): string[] {
    return this.photos()[pointId] ?? [];
  }

  async takePhoto(pointId: string): Promise<ResultadoFoto> {
  if (this.getPhotos(pointId).length >= MAX_FOTOS) return 'limite';

  try {
    const result = await Camera.takePhoto({ quality: 90 });
    if (!result.webPath) return 'cancelado';
    return await this.agregarFotos(pointId, [result.webPath]);
  } catch (error) {
    console.error('Foto cancelada o con error:', error);
    return 'cancelado';
  }
}

async pickFromGallery(pointId: string): Promise<ResultadoFoto> {
  const disponibles = MAX_FOTOS - this.getPhotos(pointId).length;
  if (disponibles <= 0) return 'limite';

  try {
    const { results } = await Camera.chooseFromGallery({
      allowMultipleSelection: true,
      limit: disponibles,
      quality: 90,
    });

    const rutas = results
      .map((r) => r.webPath)
      .filter((ruta): ruta is string => !!ruta)
      .slice(0, disponibles);

    if (rutas.length === 0) return 'cancelado';
    return await this.agregarFotos(pointId, rutas);
  } catch (error) {
    console.error('Galería cancelada o con error:', error);
    return 'cancelado';
  }
}

// Parte común: achica cada foto y las guarda todas juntas
private async agregarFotos(pointId: string, rutas: string[]): Promise<ResultadoFoto> {
  const nuevas: string[] = [];

  for (const ruta of rutas) {
    const original = await this.webPathToBase64(ruta);
    nuevas.push(await this.comprimir(original));
  }

  const nuevo = {
    ...this.photos(),
    [pointId]: [...this.getPhotos(pointId), ...nuevas],
  };

  if (!this.guardar(nuevo)) return 'sin-espacio';

  this.photos.set(nuevo);
  return 'ok';
}

  deletePhoto(pointId: string, index: number) {
    const lista = this.getPhotos(pointId).filter((_, i) => i !== index);
    const nuevo = { ...this.photos(), [pointId]: lista };
    this.guardar(nuevo);
    this.photos.set(nuevo);
  }

  private cargar(): Record<string, string[]> {
    try {
      return JSON.parse(localStorage.getItem(CLAVE) ?? '{}');
    } catch {
      return {};
    }
  }

  private guardar(datos: Record<string, string[]>): boolean {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
      return true;
    } catch {
      return false;
    }
  }

  private comprimir(dataUrl: string, maxLado = 800, calidad = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);

      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', calidad));
    };

    img.onerror = reject;
    img.src = dataUrl;
  });
}

  private async webPathToBase64(webPath: string): Promise<string> {
    const response = await fetch(webPath);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}