import { Injectable, signal } from '@angular/core';
import { Camera } from '@capacitor/camera';

const CLAVE = 'fotos_por_punto';
export const MAX_FOTOS = 5;

@Injectable({ providedIn: 'root' })
export class PhotoService {
  // Antes: { 'id': 'foto' }   Ahora: { 'id': ['foto1', 'foto2', ...] }
  private photos = signal<Record<string, string[]>>(this.cargar());

  getPhotos(pointId: string): string[] {
    return this.photos()[pointId] ?? [];
  }

  async takePhoto(pointId: string): Promise<'ok' | 'limite' | 'sin-espacio' | 'cancelado'> {
    const actuales = this.getPhotos(pointId);
    if (actuales.length >= MAX_FOTOS) return 'limite';

    try {
      const result = await Camera.takePhoto({ quality: 90 });
      if (!result.webPath) return 'cancelado';

      const base64 = await this.webPathToBase64(result.webPath);

      const nuevo = { ...this.photos(), [pointId]: [...actuales, base64] };
      if (!this.guardar(nuevo)) return 'sin-espacio';

      this.photos.set(nuevo);
      return 'ok';
    } catch (error) {
      console.error('Foto cancelada o con error:', error);
      return 'cancelado';
    }
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