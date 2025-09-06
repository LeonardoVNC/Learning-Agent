import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENROLLMENT_REPO, STUDENT_REPO, CLASSES_REPO, USER_REPO } from "../../tokens";
import type { EnrollmentRepositoryPort } from "../../domain/ports/enrollment.repository.ports";
import type { StudentRepositoryPort } from "../../domain/ports/student.repository.ports";
import type { ClassesRepositoryPort } from "../../domain/ports/classes.repository.ports";
import type { UserRepositoryPort } from "src/modules/identity/domain/ports/user.repository.port";
import { EnrollGroupStudentRow } from "../../infrastructure/http/dtos/enroll-group-student.dto";
import { InternalServerError, NotFoundError } from "src/shared/handler/errors";

@Injectable()
export class EnrollGroupStudentUseCase {
    private readonly logger = new Logger(EnrollGroupStudentUseCase.name);

    constructor(
        @Inject(ENROLLMENT_REPO) private readonly enrollmentRepo: EnrollmentRepositoryPort,
        @Inject(STUDENT_REPO) private readonly studentRepo: StudentRepositoryPort,
        @Inject(CLASSES_REPO) private readonly classesRepo: ClassesRepositoryPort,
        @Inject(USER_REPO) private readonly userRepo: UserRepositoryPort,
    ) {}

    async execute(input: { classId: string, studentRows: EnrollGroupStudentRow[] }) {
        const ojbClass = await this.classesRepo.findById(input.classId);
        if (!ojbClass) {
            this.logger.error(`Class not found with ID ${input.classId}`);
            throw new NotFoundError(`No se ha podido recupear la información de la clase`);
        }

        let totalRows = input.studentRows.length, errorRows = 0, existingRows = 0, successRows = 0
        for (const row of input.studentRows) {
            try {
                let student = await this.studentRepo.findByCode(row.studentCode);
                if (!student) {
                    this.logger.log(`Student not found with code ${row.studentCode}, creating new user`);
                    student = await this.handleNewUser (row.studentName, row.studentLastname, row.studentCode);
                }

                const existingEnrollments = await this.enrollmentRepo.findByStudentId(student.userId);
                if (existingEnrollments.some(enrollment => enrollment.classId === input.classId)) {
                    existingRows++;
                    continue;
                }

                const enrollment = await this.enrollmentRepo.create(student.userId, input.classId);
                if (enrollment) successRows++;
            } catch(error) {
                this.logger.error(
                    `Error on Enroll Group, error found on next row: ${JSON.stringify(row)}`,
                    error instanceof Error ? error.stack : undefined
                );
                errorRows++;
            }
        }
        return {totalRows, errorRows, existingRows, successRows};
    }

    async handleNewUser (studentName: string, studentLastname: string, studentCode: string) {
        const newUser  = await this.userRepo.create(
            studentName,
            studentLastname,
            `${this.fixedString(studentName)+this.fixedString(studentLastname)}.${studentCode}@upb.edu`,
            `${this.fixedString(studentLastname)+studentCode}`
        );
        if (!newUser ) {
            this.logger.error("Error creating new user on single enrollment endpoint");
            throw new InternalServerError("Error creando al usuario");
        }

        const newStudent = await this.studentRepo.create(newUser .id, studentCode);
        if (!newStudent) {
            this.logger.error("Error creating new student on single enrollment endpoint");
            throw new InternalServerError("Error creando la cuenta del estudiante");
        }
        return newStudent;
    }

    fixedString(s: string): string {
        return s.trim().toLowerCase().replace(/\s+/g, '');
    }
}
