export type Categoria =
  | 'Parque' | 'Museo' | 'CentroComercial' | 'Universidad' | 'Estadio'
  | 'Planetario' | 'Biblioteca' | 'Cafe' | 'Restaurante' | 'Otro';

export interface Lugar {
  id: string;
  nombre: string;
  typo: Categoria;
  coordenadas: [latitude: number, longitude: number];
  propio?: boolean; // true = lo creó la persona (se puede eliminar)
}

export const INFO_CATEGORIA: Record<Categoria, { emoji: string; nombre: string; plural: string }> = {
  Parque:          { emoji: '🌳', nombre: 'Parque',          plural: 'Parques' },
  Museo:           { emoji: '🏛️', nombre: 'Museo',           plural: 'Museos' },
  CentroComercial: { emoji: '🛍️', nombre: 'Centro comercial', plural: 'Centros comerciales' },
  Universidad:     { emoji: '🎓', nombre: 'Universidad',     plural: 'Universidades' },
  Estadio:         { emoji: '🏟️', nombre: 'Estadio',         plural: 'Estadios' },
  Planetario:      { emoji: '🔭', nombre: 'Planetario',      plural: 'Planetarios' },
  Biblioteca:      { emoji: '📚', nombre: 'Biblioteca',      plural: 'Bibliotecas' },
  Cafe:            { emoji: '☕', nombre: 'Café',            plural: 'Cafés' },
  Restaurante:     { emoji: '🍽️', nombre: 'Restaurante',     plural: 'Restaurantes' },
  Otro:            { emoji: '📍', nombre: 'Otro',            plural: 'Otros' },
};

export const CATEGORIAS = Object.keys(INFO_CATEGORIA) as Categoria[];