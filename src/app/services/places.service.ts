import { Injectable, computed, signal } from '@angular/core';
import { Categoria, Lugar } from '../models/lugar';
import { PUNTOS } from '../data/puntos';

const CLAVE_PROPIOS = 'lugares_propios';
const CLAVE_FAVORITOS = 'lugares_favoritos';

@Injectable({ providedIn: 'root' })
export class PlacesService {
  private propios = signal<Lugar[]>(this.leer<Lugar[]>(CLAVE_PROPIOS, []));
  favoritos = signal<string[]>(this.leer<string[]>(CLAVE_FAVORITOS, []));

  // Lugares fijos + los que creó la persona
  todos = computed<Lugar[]>(() => [...PUNTOS, ...this.propios()]);

  agregar(nombre: string, typo: Categoria, coordenadas: [number, number]): Lugar {
    const lugar: Lugar = { id: `propio-${Date.now()}`, nombre, typo, coordenadas, propio: true };
    const lista = [...this.propios(), lugar];
    this.propios.set(lista);
    this.guardar(CLAVE_PROPIOS, lista);
    return lugar;
  }

  eliminar(id: string) {
    const lista = this.propios().filter((l) => l.id !== id);
    this.propios.set(lista);
    this.guardar(CLAVE_PROPIOS, lista);

    const favs = this.favoritos().filter((f) => f !== id);
    this.favoritos.set(favs);
    this.guardar(CLAVE_FAVORITOS, favs);
  }

  esFavorito(id: string): boolean {
    return this.favoritos().includes(id);
  }

  alternarFavorito(id: string) {
    const favs = this.esFavorito(id)
      ? this.favoritos().filter((f) => f !== id)
      : [...this.favoritos(), id];
    this.favoritos.set(favs);
    this.guardar(CLAVE_FAVORITOS, favs);
  }

  private leer<T>(clave: string, porDefecto: T): T {
    try {
      const texto = localStorage.getItem(clave);
      return texto ? JSON.parse(texto) : porDefecto;
    } catch {
      return porDefecto;
    }
  }

  private guardar(clave: string, valor: unknown) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
    } catch (error) {
      console.error('No se pudo guardar', clave, error);
    }
  }
}