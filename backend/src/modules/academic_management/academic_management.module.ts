import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { CLASSES_REPO, COURSE_REPO, ENROLLMENT_REPO, TEACHER_REPO,STUDENT_REPO } from './tokens';
import { CreateClassUseCase } from './application/commands/create-class.usecase';
import { CreateStudentUseCase } from './application/commands/create-student.usecase';
import { CreateStudentProfileUseCase } from './application/commands/create-student-profile.usecase';
import { ClassesPrismaRepository } from './infrastructure/persistence/classes.prisma.repository';
import { StudentPrismaRepository } from './infrastructure/persistence/student.prisma.repository';
import { AcademicManagementController } from './infrastructure/http/academic_management.controller';
import { ListClassesUseCase } from './application/queries/list-classes.usecase';
import { ListStudentsUseCase } from './application/queries/list-student.usecase';
import { EnrollmentPrismaRepository } from './infrastructure/persistence/enrollment.prisma.repository';
import { GetClassesByStudentUseCase } from './application/queries/get-classes-by-student.usecase';
import { GetStudentsByClassUseCase } from './application/queries/get-students-by-class.usecase';
import { GetClassByIdUseCase } from './application/queries/get-class-by-id.usecase';
import { EnrollSingleStudentUseCase } from './application/commands/enroll-single-student.usecase';
import { EnrollGroupStudentUseCase } from './application/commands/enroll-group-students.usecase';
import { UpdateClassUseCase } from './application/commands/update-class.usecase';
import { SoftDeleteClassUseCase } from './application/commands/soft-delete-class.usecase';
import { GetTeacherInfoByIDUseCase } from './application/queries/get-teacher-info-by-id.usecase';
import { TeacherPrismaRepository } from './infrastructure/persistence/teacher.prisma.repository';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { IdentityModule } from '../identity/identity.module';
import { CoursePrismaRepository } from './infrastructure/persistence/course.prisma.repository';
import { CreateCourseUseCase } from './application/commands/create-course.usecase';
import { GetCoursesByTeacherUseCase } from './application/queries/get-courses-by-teacher.usecase';
import { GetClassesByCourseUseCase } from './application/queries/get-classes-by-course.usecase';
import { GetCourseByIdUseCase } from './application/queries/get-course-by-id.usecase';

@Module({
  imports: [PrismaModule,IdentityModule],
  controllers: [AcademicManagementController],
  providers: [
    {provide: CLASSES_REPO,  useClass: ClassesPrismaRepository }  ,
    {provide: COURSE_REPO, useClass: CoursePrismaRepository},
    {provide: STUDENT_REPO,  useClass: StudentPrismaRepository}  ,
    {provide: TEACHER_REPO, useClass: TeacherPrismaRepository},
    {provide: ENROLLMENT_REPO, useClass: EnrollmentPrismaRepository},
    ListClassesUseCase,
    ListStudentsUseCase,
    GetCourseByIdUseCase,
    GetCoursesByTeacherUseCase,
    GetClassesByCourseUseCase,
    GetClassByIdUseCase,
    GetClassesByStudentUseCase,
    GetStudentsByClassUseCase,
    GetTeacherInfoByIDUseCase,
    CreateCourseUseCase,
    CreateClassUseCase,
    CreateStudentUseCase,
    CreateStudentProfileUseCase,
    EnrollSingleStudentUseCase,
    JwtAuthGuard,
    EnrollGroupStudentUseCase,
    UpdateClassUseCase,
    SoftDeleteClassUseCase,
  ],
})
export class AcademicManagementModule {}