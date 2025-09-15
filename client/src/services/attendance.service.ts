import apiClient from "../api/apiClient";
import type { CreateAttendanceInterface } from "../interfaces/attendanceInterface";

export const attendanceService = {
    //Enpoints POST
    async saveAttendanceList(classId: string, attendanceData: Omit<CreateAttendanceInterface, "classId">) {
        try {
            const response = await apiClient.post(`/academic/attendance/${classId}`, attendanceData);
            return response.data;
        } catch (error) {
            console.error("Failed to enroll student in class", error);
            throw error;
        }
    },
    
}