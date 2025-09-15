import { useEffect, useState } from "react";
import { useUserStore } from "../store/userStore"
import { courseService } from "../services/course.service";
import type { Course } from "../interfaces/courseInterface";

const useCourses = () => {
    const [actualCourse, setActualCourse] = useState<Course>()
    const [courses, setCourses] = useState<Course[]>([]);
    const [coursesSet, setCoursesSet] = useState<Set<string>>();
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

    useEffect(() => {
        const set = new Set<string>();
        courses.forEach((course: Course) => {
            set.add(course.name.toLowerCase().trim());
        })
        setCoursesSet(set)
    },[courses])

    //Endpoints GET
    const getCourseByID = async (courseId: string) => {
        const res = await courseService.getCourseById(courseId);
        const success = res?.code == 200
        if (success) {
            setActualCourse(res.data)
        }
        return {
            state: success ? "success" : "error",
            message: success ? "Materia recuperada exitosamente" : res?.error
        }
    }

    const fetchCoursesByTeacher = async (teacherId: string) => {
        const res = await courseService.getCourseByTeacher(teacherId);
        const success = res?.code == 200
        if (success) {
            setCourses(res.data)
        }
        return {
            state: success ? "success" : "error",
            message: success ? "Materias recuperadas exitosamente" : res?.error
        }
    }

    //Endpoints POST
    const createCourse = async (name: string) => {
        if (!user) {
            return {
                state: "error",
                message: "No se ha cargado la información del usuario"
            }
        }

        if(coursesSet?.has(name.toLowerCase().trim())) {
            return {
                state: "error",
                message: "Ya se ha registrado una materia con ese nombre"
            }
        }

        const req = {
            name,
            teacherId: user.id
        }

        const res = await courseService.createCourse(req);
        const success = res?.code == 201
        if (success && user){
            await fetchCoursesByTeacher(user.id)
        }
        return {
            state: success ? "success" : "error",
            message: success ? "Materia registrada exitosamente" : res?.error
        }
    }

    return {
        actualCourse,
        courses,
        getCourseByID,
        fetchCoursesByTeacher,
        createCourse
    }
}

export default useCourses;
