import { useEffect, useState } from "react";
import type { Student, StudentInfo } from "../interfaces/studentInterface";
import { useUserStore } from "../store/userStore";
import { studentService } from "../services/student.service";

const useStudents = () => {
  const [students, setStudents] = useState<StudentInfo>();
  const [actualStudent, setActualStudent] = useState<Student>();

  const user = useUserStore((s) => s.user);
  const fetchUser = useUserStore((s) => s.fetchUser);

  useEffect(() => {
    const prepareHook = async () => {
      if (!user) {
        await fetchUser();
      }
    };
    prepareHook();
  }, [user]);

  //Endpoints GET
  const fetchStudentsByClass = async (classId: string) => {
    const res = await studentService.getStudentsByClassId(classId);
    const success = res.code == 200;
    if (success) {
      setStudents(res.data);
    }
    return {
      state: success ? "success" : "error",
      message: success ? "Estudiantes recuperados" : res.error,
    };
  };

  const softDeleteStudent = async (studentId: string) => {
    if (!studentId || !user) {
      return {
        success: "error",
        message: "Ha ocurrido un error, inténtelo de nuevo",
      };
    }

    const res = await studentService.softDeleteStudent(studentId);
    const success = res.code == 201;
    if (success) {
      setActualStudent(res.data);
      return {
        state: "success",
        message: "Estudiante eliminado exitosamente",
      };
    } else {
      const state = res.code == 409 ? "info" : "error";
      return {
        state,
        message: res.error,
      };
    }
  };

  return {
    actualStudent,
    students,
    fetchStudentsByClass,
    softDeleteStudent,
  };
};

export default useStudents;
