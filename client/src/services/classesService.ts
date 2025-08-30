import apiClient from "../api/apiClient";
import type { Clase } from "../interfaces/claseInterface";

export const claseService = {
  async getClases(): Promise<Clase[]> {
    try {
      const response = await apiClient.get("/academic/classes/");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch clases", error);
      throw error;
    }
  },
  
  async getClaseById(id: string): Promise<Clase> {
    try {
      const response = await apiClient.get(`/academic/classes/${id}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch clase", error);
      throw error;
    }
  },

  async getClasesByCourseId(courseId: string): Promise<Clase[]> {
    try {
      const response = await apiClient.get('/academic/classes');
      const allClases: Clase[] = response.data.data || [];
      
      return allClases.filter(clase => {
        return clase.courseId === courseId || clase.courseId === courseId.toString() || String(clase.courseId) === String(courseId);
      });
    } catch (error) {
      console.error("Failed to fetch clases by course", error);
      throw error;
    }
  },

  async createClase(clase: Omit<Clase, "id">): Promise<Clase> {
    try {
      if (!clase.courseId) {
        throw new Error("courseId is required to create a class");
      }
      
      const backendData = {
        name: clase.name,
        semester: clase.semester,
        courseId: clase.courseId,
        dateBegin: new Date(clase.dateBegin).toISOString(),
        dateEnd: new Date(clase.dateEnd).toISOString(),
      };
      
      const response = await apiClient.post("/academic/classes", backendData);
      
      const createdClase: Clase = {
        id: response.data.data.id,
        name: response.data.data.name,
        semester: response.data.data.semester,
        teacherId: response.data.data.teacherId || clase.teacherId,
        courseId: response.data.data.courseId || clase.courseId,
        dateBegin: response.data.data.dateBegin,
        dateEnd: response.data.data.dateEnd,
      };
      
      return createdClase;
    } catch (error) {
      console.error("Failed to create clase", error);
      throw error;
    }
  },

  async updateClase(id: string, claseData: Partial<Clase>): Promise<Clase> {
    try {
      const response = await apiClient.put(`/academic/classes/${id}`, claseData);
      return response.data;
    } catch (error) {
      console.error("Failed to update clase", error);
      throw error;
    }
  },

  async softDeleteClase(id: string, teacherId: string) {
    try {
      const response = await apiClient.put(`/academic/classes/remove/${id}`, {teacherId});
      return {
        success: true,
        data: response.data
      }
    } catch (error) {
      console.error("Failed to soft-delete clase", error);
      return {
        success: false
      }
    }
  },
};

// Función auxiliar para obtener períodos por curso
export const getPeriodsByCourse = async (courseId: string): Promise<Clase[]> => {
  return claseService.getClasesByCourseId(courseId);
};