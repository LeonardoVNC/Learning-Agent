import apiClient from "../api/apiClient";

export const studentService = {
  //Endpoints GET
  async getStudentsByClassId(classId: string) {
    try {
      const response = await apiClient.get(`/academic/students/by-class/${classId}`);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch students by classId", error);
      throw error;
    }
  },
  async softDeleteStudent(id: string) {
    try {
      const response = await apiClient.put(`/enrollment/remove/${id}`); //TODO: Conectar con el endPoint correspondiente
      return response.data
    } catch (error) {
      console.error("Failed to soft-delete student", error);
      throw error;
    }
  },
};
