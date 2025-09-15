import { useEffect } from "react";
import { useUserStore } from "../store/userStore";
import { attendanceService } from "../services/attendance.service";

const useAttendance = () => {
  const user = useUserStore((s) => s.user);
  const fetchUser = useUserStore((s) => s.fetchUser);

  useEffect(() => {
    const prepareHook = async () => {
      if (!user) await fetchUser();
    };
    prepareHook();
  }, [user]);

  const saveAttendanceList = async (attendanceInfo: any) => {
    if (!user) return { state: "error", message: "No se ha podido cargar la información del usuario" };
    const classId = attendanceInfo.classId;
    const attendanceData = {
      teacherId: user.id,
      date: attendanceInfo.date,
      studentRows: attendanceInfo.studentRows,
    };
    const res = await attendanceService.saveAttendanceList(classId, attendanceData);
    if (res?.code === 201) return { state: "success", message: "Asistencia guardada correctamente" };
    return { state: res?.code === 409 ? "info" : "error", message: res?.error };
  };

  const fetchAbsencesByClass = async (classId: string) => {
    if (!user) return { state: "error", message: "Usuario no cargado" };
    try {
      const res = await attendanceService.getAbsencesByClass(classId, user.id);
      const dataArr = Array.isArray(res?.data) ? res.data : [];
      return { state: "success", data: dataArr };
    } catch (err: any) {
      return { state: "error", message: err?.message ?? "Error al obtener ausencias" };
    }
  };

  return {
    saveAttendanceList,
    fetchAbsencesByClass,
  };
};

export default useAttendance;
