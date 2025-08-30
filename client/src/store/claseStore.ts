import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Clase } from '../interfaces/claseInterface';

interface ClaseState {
  clases: Clase[];
  setClases: (items: Clase[]) => void;
  addClase: (clase: Clase) => void;
  updateClase: (id: string, data: Partial<Clase>) => void;
  deleteClase: (id: string) => void;
  clearClases: () => void;
}

export const useClaseStore = create(
  persist<ClaseState>(
    (set) => ({
      clases: [],
      setClases: (items) => set({ clases: items }),
      addClase: (clase) => set((state) => ({ 
        clases: Array.isArray(state.clases) ? [...state.clases, clase] : [clase] 
      })),
      updateClase: (id, data) =>
        set((state) => ({
          clases: state.clases.map((clase) =>
            clase.id === id ? { ...clase, ...data } : clase
          )
        })),
      deleteClase: (id) =>
        set((state) => ({
          clases: state.clases.filter((clase) => clase.id !== id)
        })),
      clearClases: () => set({ clases: [] })
    }),
    {
      name: 'clase-storage'
    }
  )
);