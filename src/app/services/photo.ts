import { Injectable, signal } from '@angular/core';
import { Camera } from '@capacitor/camera';

@Injectable({ providedIn: 'root' })
export class PhotoService {
  // Aquí guardamos las fotos: { 'id del punto': 'foto en base64' }
  private photos = signal<Record<string, string>>({});

  // Devuelve la foto de un punto (o undefined si no tiene)
  getPhoto(pointId: string): string | undefined {
    return this.photos()[pointId];
  }

  // Toma la foto y la guarda asociada al ID del punto
  async takePhoto(pointId: string): Promise<string | undefined> {
    const result = await Camera.takePhoto({
      quality: 90,
      includeMetadata: true,
    });

    if (!result.webPath) {
      console.error('No se obtuvo webPath de la foto');
      return undefined;
    }

    const base64 = await this.webPathToBase64(result.webPath);

    // Copiamos el objeto anterior y le agregamos la nueva foto
    this.photos.update((all) => ({ ...all, [pointId]: base64 }));

    return base64;
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