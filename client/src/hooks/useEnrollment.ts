import { useState } from "react";
import type { Student } from "../interfaces/studentInterface";

import type {
  createEnrollmentInterface,
  EnrollGroupRequest,
  EnrollGroupResponse,
} from "../interfaces/enrollmentInterface";
import { enrollmentService } from "../services/enrollment.service";

const useEnrollment = () => {
  const [actualStudent, setActualStudent] = useState<Student>();

  //Endpoints POST
  const enrollSingleStudent = async (enrollData: createEnrollmentInterface) => {
    const res = await enrollmentService.enrollStudentInClass(enrollData);
    const success = res.code == 201;
    return {
      state: success ? "success" : "error",
      message: success ? "Estudiante inscrito correctamente" : res.error,
    };
  };

  const enrollGroupStudents = async (payload: EnrollGroupRequest) => {
    const res = await enrollmentService.enrollGroupStudents(payload);
    const success = res.code == 201;

    if (success) {
      const data: EnrollGroupResponse = res.data;
      return {
        state: "success",
        message: "Solicitud procesada correctamente",
        data,
      };
    } else {
      return {
        state: "error",
        message: res.error,
        data: "",
      };
    }
  };

  const softDeleteStudent = async (studentId: string) => {
    if (!studentId) {
      return {
        success: "error",
        message: "Ha ocurrido un error, inténtelo de nuevo",
      };
    }

    const res = await enrollmentService.softDeleteStudent(studentId);
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
    enrollSingleStudent,
    enrollGroupStudents,
    softDeleteStudent,
  };
};

export default useEnrollment;
