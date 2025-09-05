import { Body, Controller, Get, Param, Post, UseGuards, Put } from '@nestjs/common';
import { CreateClassUseCase } from '../../application/commands/create-class.usecase';
import { CreateStudentProfileDto } from './dtos/create-studentProfile.dto';
import { CreateClassDto } from './dtos/create-classes.dto';
import { ListClassesUseCase } from '../../application/queries/list-classes.usecase';
import { ListStudentsUseCase } from '../../application/queries/list-student.usecase';
import { CreateStudentProfileUseCase } from '../../application/commands/create-student-profile.usecase';
import { GetClassesByStudentUseCase } from '../../application/queries/get-classes-by-student.usecase';
import { GetStudentsByClassUseCase } from '../../application/queries/get-students-by-class.usecase';
import { GetClassByIdUseCase } from '../../application/queries/get-class-by-id.usecase';
import { EnrollSingleStudentDto } from './dtos/enroll-single-student.dto';
import { EnrollSingleStudentUseCase } from '../../application/commands/enroll-single-student.usecase';
import { EnrollGroupStudentUseCase } from '../../application/commands/enroll-group-students.usecase';
import { EnrollGroupStudentDTO } from './dtos/enroll-group-student.dto';
import { UpdateClassUseCase } from '../../application/commands/update-class.usecase';
import { EditClassDTO } from './dtos/edit-class.dto';
import { SoftDeleteClassUseCase } from '../../application/commands/soft-delete-class.usecase';
import { DeleteClassDTO } from './dtos/delete-class.dto';
import { DeleteStudentDTO } from './dtos/delete-student.dto';
import { GetTeacherInfoByIDUseCase } from '../../application/queries/get-teacher-info-by-id.usecase';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { CreateCourseUseCase } from '../../application/commands/create-course.usecase';
import { CreateCourseDTO } from './dtos/create-course.dto';
import { GetCoursesByTeacherUseCase } from '../../application/queries/get-courses-by-teacher.usecase';
import { GetClassesByCourseUseCase } from '../../application/queries/get-classes-by-course.usecase';
import { responseAlreadyCreated, responseConflict, responseCreated, responseForbidden, responseInternalServerError, responseNotFound, responseSuccess } from 'src/shared/handler/http.handler';
import { AlreadyCreatedError, ForbiddenError, NotFoundError,ConflictError } from 'src/shared/handler/errors';
import { GetCourseByIdUseCase } from '../../application/queries/get-course-by-id.usecase';
import { SoftDeleteSingleEnrollmentUseCase } from '../../application/commands/soft-delete-single-enrollment.useCase';
const academicRoute = 'academic'

@UseGuards(JwtAuthGuard)
@Controller(academicRoute)
export class AcademicManagementController {
  constructor(
    private readonly listClasses: ListClassesUseCase,
    private readonly listStudents: ListStudentsUseCase,
    private readonly getCourseById: GetCourseByIdUseCase,
    private readonly getCoursesByTeacher: GetCoursesByTeacherUseCase,
    private readonly getClassesByCourse: GetClassesByCourseUseCase,
    private readonly getClassById: GetClassByIdUseCase,
    private readonly getClassesByStudent: GetClassesByStudentUseCase,
    private readonly getStudentsByClass: GetStudentsByClassUseCase,
    private readonly getTeacherInfoById: GetTeacherInfoByIDUseCase,
    private readonly createCourse: CreateCourseUseCase,
    private readonly createClasses: CreateClassUseCase,
    private readonly createProfileStudent: CreateStudentProfileUseCase,
    private readonly enrollSingle: EnrollSingleStudentUseCase,
    private readonly enrollGroup: EnrollGroupStudentUseCase,
    private readonly updateClass: UpdateClassUseCase,
    private readonly softDeleteClass: SoftDeleteClassUseCase,
    private readonly softDeleteStudent: SoftDeleteSingleEnrollmentUseCase,
  ) { }

  //Endpoints GET
  @Get('classes')
  async listClassesEndPoint() {
    const path = academicRoute + "/classes"
    const description = "List all active classes endpoint"
    try {
      const classesData = await this.listClasses.execute();
      return responseSuccess("Sin implementar", classesData, description, path)
    } catch (error) {
      return responseInternalServerError(error.message, "Sin implementar", description, path)
    }
  }

  @Get('students')
  async listStudentEndPoint() {
    const path = academicRoute + "/students"
    const description = "List all students endpoint"
    try {
      const students = await this.listStudents.execute();
      return responseSuccess("Sin implementar", students, description, path)
    } catch (error) {
      return responseInternalServerError(error.message, "Sin implementar", description, path)
    }
  }

  @Get('course/:id')
  async getCourseByIdEndpoint(@Param('id') id: string) {
    const path = academicRoute + `/course/${id}`
    const description = "Get course by ID"
    try {
      const course = await this.getCourseById.execute(id);
      return responseSuccess("Sin implementar", course, description, path)
    } catch(error) {
      if (error instanceof NotFoundError) {
        return responseNotFound(error.message, "Sin implementar", description, path)
      } else {
        return responseInternalServerError(error.message, "Sin implementar", description, path)
      }
    }
  }

  @Get('course/by-teacher/:id')
  async getCourseByTeaceherEndpoint(@Param('id') id: string) {
    const path = academicRoute + `/course/by-teacher/${id}`
    const description = "List all courses of a teacher"
    try {
      const courses = await this.getCoursesByTeacher.execute(id)
      return responseSuccess("Sin implementar", courses, description, path)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return responseNotFound(error.message, "Sin implementar", description, path)
      } else {
        return responseInternalServerError(error.message, "Sin implementar", description, path)
      }
    }
  }

  @Get('classes/by-course/:id')
  async getClassesByCourseEndpoint(@Param('id') id: string) {
    const path = academicRoute + `/classes/by-course/${id}`
    const description = "List all classes of a course"
    try {
      const classes = await this.getClassesByCourse.execute(id)
      return responseSuccess("Sin implementar", classes, description, path)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return responseNotFound(error.message, "Sin implementar", description, path)
      } else {
        return responseInternalServerError(error.message, "Sin implementar", description, path)
      }
    }
  }

  @Get('classes/:id')
  async getClassByIdEndpoint(@Param('id') id: string) {
    const path = academicRoute + `/classes/${id}`
    const description = "Get class by ID"
    try {
      const objClass = await this.getClassById.execute(id);
      return responseSuccess("Sin implementar", objClass, description, path)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return responseNotFound(error.message, "Sin implementar", description, path)
      } else {
        return responseInternalServerError(error.message, "Sin implementar", description, path)
      }
    }
  }

  @Get('classes/by-student/:studentId')
  async getClassesByStudentEndpoint(@Param('studentId') studentId: string) {
    const path = academicRoute + `/classes/by-student/${studentId}`
    const description = "Get classes by student ID"
    try {
      const classesData = await this.getClassesByStudent.execute(studentId);
      return responseSuccess("Sin implementar", classesData, description, path)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return responseNotFound(error.message, "Sin implementar", description, path)
      } else {
        return responseInternalServerError(error.message, "Sin implementar", description, path)
      }
    }
  }

  @Get('students/by-class/:classId')
  async getStudentsByClassEndpoint(@Param('classId') classId: string) {
    const path = academicRoute + `/classes/by-student/${classId}`
    const description = "Get students by class ID"
    try {
      const studentsData = await this.getStudentsByClass.execute(classId);
      return responseSuccess("Sin implementar", studentsData, description, path)
    } catch (error) {
      return responseInternalServerError(error.message, "Sin implementar", description, path)
    }
  }

  @Get('teacher/:id')
  async getTeacherInfoByID(@Param('id') id: string) {
    const path = academicRoute + `/teacher/${id}`
    const description = "List teacher info by ID"
    try {
      const teacherInfo = await this.getTeacherInfoById.execute(id);
      return responseSuccess("Sin implementar", teacherInfo, description, path)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return responseNotFound(error.message, "Sin implementar", description, path)
      } else {
        return responseInternalServerError(error.message, "Sin implementar", description, path)
      }
    }
  }


  //Endpoints POST
  @Post('course')
  async createCourseEndpoint(@Body() dto: CreateCourseDTO) {
    const path = academicRoute + `/course`
    const description = "Create a new course"
    try {
      const classesData = await this.createCourse.execute(dto)
      return responseCreated("Sin implementar", classesData, description, path)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return responseNotFound(error.message, "Sin implementar", description, path)
      } else {
        return responseInternalServerError(error.message, "Sin implementar", description, path)
      }
    }
  }

  @Post('classes')
  async createClassEndpoint(@Body() dto: CreateClassDto) {
    const path = academicRoute + `/classes`
    const description = "Create a new Class"
    try {
      const classesData = await this.createClasses.execute(dto);
      return responseCreated("Sin implementar", classesData, description, path)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return responseNotFound(error.message, "Sin implementar", description, path)
      } else if (error instanceof ForbiddenError) {
        return responseForbidden(error.message, "Sin implementar", description, path)
      } else{
        return responseInternalServerError(error.message, "Sin implementar", description, path)
      }
    }
  }

  @Post('students')
  async createStudentEndpoint(@Body() dto: CreateStudentProfileDto) {
    const path = academicRoute + `/students`
    const description = "Create a new student"
    try {
      const student = await this.createProfileStudent.execute(dto);
      return responseCreated("Sin implementar", student, description, path)
    } catch (error) {
      return responseInternalServerError(error.message, "Sin implementar", description, path)
    }
  }

  @Post('enrollments/single-student')
  async enrollSingleStudentEndpoint(@Body() dto: EnrollSingleStudentDto) {
    const path = academicRoute + `/enrollments/single-student`
    const description = "Enroll one student to a class"
    try {
      const enrollment = await this.enrollSingle.execute(dto);
      return responseCreated("Sin implementar", enrollment, description, path)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return responseNotFound(error.message, "Sin implementar", description, path)
      } else if (error instanceof AlreadyCreatedError) {
        return responseAlreadyCreated(error.message, "Sin implementar", description, path)
      } else {
        return responseInternalServerError(error.message, "Sin implementar", description, path)
      }
    }
  }

  @Post('enrollments/group-students')
  async enrollGroupStudentEndpoint(@Body() dto: EnrollGroupStudentDTO) {
    const path = academicRoute + `/enrollments/group-students`
    const description = "Enroll a group of students to a class"
    try {
      const enrollments = await this.enrollGroup.execute(dto);
      return responseCreated("Sin implementar", enrollments, description, path)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return responseNotFound(error.message, "Sin implementar", description, path)
      } else {
        return responseInternalServerError(error.message, "Sin implementar", description, path)
      }
    }
  }


  //Endpoints PUT
  @Put('classes/:id')
  async updateClassEndpoint(@Param('id') id: string, @Body() dto: EditClassDTO) {
    const path = academicRoute + `/classes/${id}`
    const description = "Update information of a class by id"
    try {
      const input = {
        teacherId: dto.teacherId,
        classId: id,
        name: dto.name,
        semester: dto.semester,
        dateBegin: dto.dateBegin,
        dateEnd: dto.dateEnd
      }
      const objClass = await this.updateClass.execute(input);
      return responseCreated("Sin implementar", objClass, description, path)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return responseNotFound(error.message, "Sin implementar", description, path)
      } else if (error instanceof ForbiddenError) {
        return responseForbidden(error.message, "Sin implementar", description, path)
      } else {
        return responseInternalServerError(error.message, "Sin implementar", description, path)
      }
    }
  }

  @Put('classes/remove/:id')
  async softDeleteEndpoint(@Param('id') id: string, @Body() dto: DeleteClassDTO) {
    const path = academicRoute + `/classes/remove/${id}`
    const description = "Soft delete a class by id"
    try {
      const input = {
        teacherId: dto.teacherId,
        classId: id
      }
      const objClass = await this.softDeleteClass.execute(input)
      return responseCreated("Sin implementar", objClass, description, path)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return responseNotFound(error.message, "Sin implementar", description, path)
      } else if (error instanceof ForbiddenError) {
        return responseForbidden(error.message, "Sin implementar", description, path)
      } else if (error instanceof ConflictError) {
        return responseConflict(error.message, "Sin implementar", description, path)
      } else {
        return responseInternalServerError(error.message, "Sin implementar", description, path)
      }
    }
  }

  
  @Put('students/remove/:id')
  //idclass, idteacher, idstudent 
  async softDeleteStudents(@Param('id') id: string, @Body() dto: DeleteStudentDTO) {
    const path = academicRoute + `/students/remove/${id}`
    const description = "Soft delete a student by student ID and class ID";
    try {
      const input = {
        teacherId: dto.teacherId,
        studentId: dto.studentId,
        classId: id
      }

      const enrollment = await this.softDeleteStudent.execute(input)
      return responseCreated("Sin implementar", enrollment, description, path)
    } catch (error) {
      if (error instanceof NotFoundError) {
        return responseNotFound(error.message, "Sin implementar", description, path)
      } else if (error instanceof ForbiddenError) {
        return responseForbidden(error.message, "Sin implementar", description, path)
      } else if (error instanceof ConflictError) {
        return responseConflict(error.message, "Sin implementar", description, path)
      } else {
        return responseInternalServerError(error.message, "Sin implementar", description, path)
      }
    }
  }




}