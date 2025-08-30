import apiClient from "../api/apiClient";
import type { Course } from "../interfaces/courseInterface";

export const courseService = {
  async createCourse(course: Omit<Course, "id">): Promise<Course> {
    try {
      const response = await apiClient.post("/academic/course/", course);
      return response.data;
    } catch (error) {
      console.error("Failed to create course", error);
      throw error;
    }
  },

  async getCourseByTeacher(teacherId: string): Promise<Course[]> {
    try {
      const response = await apiClient.get(
        `/academic/course/by-teacher/${teacherId}`
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to get courses", error);
      throw error;
    }
  },

  async getCourseById(courseId: string): Promise<Course> {
    try {
      const response = await apiClient.get(`/academic/course/${courseId}`);
      return response.data.data;
    } catch (error) {
      console.error("Failed to get course by id", error);
      throw error;
    }
  },
};
