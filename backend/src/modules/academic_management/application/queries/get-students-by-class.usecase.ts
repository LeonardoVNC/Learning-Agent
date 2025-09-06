import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENROLLMENT_REPO, STUDENT_REPO, USER_REPO, CLASSES_REPO } from "../../tokens";
import type { EnrollmentRepositoryPort } from "../../domain/ports/enrollment.repository.ports";
import type { StudentRepositoryPort } from "../../domain/ports/student.repository.ports";
import type { UserRepositoryPort } from "src/modules/identity/domain/ports/user.repository.port";
import type { ClassesRepositoryPort } from "../../domain/ports/classes.repository.ports";
import { UserInfoDTO } from "../../infrastructure/http/dtos/response.user-info.dto";
import { NotFoundError } from "src/shared/handler/errors";

@Injectable()
export class GetStudentsByClassUseCase {
    private readonly logger = new Logger(GetStudentsByClassUseCase.name)
    constructor(
        @Inject(ENROLLMENT_REPO) private readonly enrollmentRepo: EnrollmentRepositoryPort,
        @Inject(STUDENT_REPO) private readonly studentRepo: StudentRepositoryPort,
        @Inject(USER_REPO) private readonly userRepo: UserRepositoryPort,
        @Inject(CLASSES_REPO) private readonly classesRepo: ClassesRepositoryPort,
    ) {}

    async execute(classId: string): Promise<UserInfoDTO[]> {
        const objClass = await this.classesRepo.findById(classId);
        if (!objClass) {
            this.logger.error(`Class not found with id ${classId}`)
            throw new NotFoundError(`No se ha podido recuperar la información de la clase`)
        }
        const enrollmentIDs =  await this.enrollmentRepo.findByClassId(classId);
        const students = await this.findStudents(enrollmentIDs);
        return students;
    }

    async findStudents(enrollmentIDs: any[]): Promise<UserInfoDTO[]> {
        const students: UserInfoDTO[] = [];
        for (const enrollment of enrollmentIDs) {
            const student = await this.studentRepo.findByUserId(enrollment.studentId);
            if (!student) continue;

            const user = await this.userRepo.findById(student.userId);
            if (!user) continue;

            const studentInfo = new UserInfoDTO(
                user.id,
                student.code,
                user.name,
                user.lastname,
                user.email,
                user.isActive,
                student.career,
                student.admissionYear
            );
            if (studentInfo) students.push(studentInfo);
        }

        return students;
    }
}