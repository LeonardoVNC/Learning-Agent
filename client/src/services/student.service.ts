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
};
