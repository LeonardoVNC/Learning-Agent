import { useEffect, useState } from "react"
import { classService } from "../services/classes.service";
import type { Clase, CreateClassDTO } from "../interfaces/claseInterface";
import { useUserStore } from "../store/userStore";

const useClasses = () => {
  const [actualClass, setActualClass] = useState<Clase>();
  const [classes, setClasses] = useState<Clase[]>([]);
  const user = useUserStore((s) => s.user);
  const fetchUser = useUserStore((s) => s.fetchUser);

  useEffect(() => {
    const prepareHook = async () => {
      if (!user) {
        await fetchUser();
      }
    }
    prepareHook();
  }, [user]);

  //Endpoints GET
  const fetchClassById = async (classId: string) => {
    const res = await classService.getClassById(classId);
    const success = res?.code == 200
    if (success) {
      setActualClass(res.data)
    }
    return {
      state: success ? "success" : "error",
      message: success ? "Período recuperado exitosamente" : res?.error
    }
  }

  const fetchClassesByStudent = async (studentId: string) => {
    const res = await classService.getClassesByStudentId(studentId);
    const success = res?.code == 200
    if (success) {
      setClasses(res.data)
    }
    return {
      state: success ? "success" : "error",
      message: success ? "Períodos recuperados exitosamente" : res?.error
    }
  }

  const fetchClassesByCourse = async (courseId: string) => {
    const res = await classService.getClassesByCourseId(courseId);
    const success = res?.code == 200
    if (success) {
      setClasses(res.data)
    }
    return {
      state: success ? "success" : "error",
      message: success ? "Períodos recuperados exitosamente" : res?.error
    }
  };

  //Endpoints POST
  const createClass = async (data: Omit<CreateClassDTO, 'teacherId'>) => {
    if (!user) {
      return {
        state: "error",
        message: "No se ha cargado la información del usuario"
      }
    }

    const newClass = { ...data, teacherId: user.id }

    const res = await classService.createClass(newClass);
    const success = res?.code == 201
    return {
      state: success ? "success" : "error",
      message: success ? "Período creado exitosamente" : res?.error
    }
  };

  //Endpoints PUT
  const updateClass = async (values: Clase) => {
    const res = await classService.updateClass(values.id, values);
    const success = res?.code == 201
    if (success) {
      setActualClass(res.data)
    }
    return {
      state: success ? "success" : "error",
      message: success ? "Período actualizado exitosamente" : res?.error
    }
  }

  const softDeleteClass = async (classId: string) => {
    if (!classId || !user) {
      return {
        success: "error",
        message: "Ha ocurrido un error, inténtelo de nuevo"
      }
    }

    const res = await classService.softDeleteClase(classId, user.id);
    const success = res?.code == 201
    if (success) {
      setActualClass(res.data)
      return {
        state: "success",
        message: "Período eliminado exitosamente"
      }
    } else {
      const state = res?.code == 409 ? "info" : "error"
      return {
        state,
        message: res?.error
      }
    }
  }

  return {
    actualClass,
    classes,
    fetchClassesByCourse,
    fetchClassesByStudent,
    createClass,
    fetchClassById,
    updateClass,
    softDeleteClass,
  }
}

export default useClasses
