import { useEffect, useState } from "react"
import { claseService } from "../services/classesService"
import { useClaseStore } from "../store/claseStore";
import type { Clase } from "../interfaces/claseInterface";
import { studentService } from "../services/studentService";
import type { StudentInfo } from "../interfaces/studentInterface";
import { useUserContext } from "../context/UserContext";

const useClasses = () => {
  const { clases, setClases, addClase } = useClaseStore();
  const [objClass, setObjClass] = useState<Clase>();
  const [curso, setCurso] = useState('')
  const [students, setStudents] = useState<StudentInfo[]>([])
  const { user, fetchUser } = useUserContext();

  useEffect(() => {
    fetchClases();
    if (!user || user === null) {
      fetchUser()
    }
  }, []);

  const fetchClases = async () => {
    const clases = await claseService.getClases()
    setClases(clases);
  }

  const createClass = async (newClase: Omit<Clase, 'id'>) => {
    const objClass = await claseService.createClase(newClase);
    addClase(objClass)
    return objClass;
  }

  const fetchClase = async (id: string) => {
    const curso = await claseService.getClaseById(id)
    setObjClass(curso);
    setCurso(curso.name)
    const students = await studentService.getStudentsByClassId(id)
    setStudents(students)
  }

  const createStudents = async (newStudentGroup: Omit<StudentInfo, 'id'>) => {
    console.log(newStudentGroup)
  }

  const deleteClass = async (classId: string) => {
    try {
      const deleteResult = await claseService.softDeleteClase(classId, user?.id || "")
      console.log("delete result: ", deleteResult)
    } catch (error) {
      console.error(`Error deleting class with id ${classId}`, error);
    }
  }

  const updateClass = async (values: Clase) => {
    try {
      if (!values.id) return;
      const updatedClass = await claseService.updateClase(values.id, values);
      setObjClass(updatedClass);
      return updatedClass;
    } catch (error) {
      console.error("Error updating class", error);
      throw error;
    }
  }

  const softDeleteClass = async (classId: string) => {
    try {
      const deleteResult = await claseService.softDeleteClase(classId, user?.id || "")
      return deleteResult;
    } catch (error) {
      console.error(`Error soft deleting class with id ${classId}`, error);
      throw error;
    }
  }

  return {
    clases,
    objClass,
    curso,
    students,
    createClass,
    fetchClases,
    fetchClase,
    createStudents,
    deleteClass,
    updateClass,
    softDeleteClass
  }
}

export default useClasses
