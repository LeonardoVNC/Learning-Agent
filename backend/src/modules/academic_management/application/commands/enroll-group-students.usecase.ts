import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENROLLMENT_REPO, STUDENT_REPO, CLASSES_REPO } from "../../tokens";
import type { EnrollmentRepositoryPort } from "../../domain/ports/enrollment.repository.ports";
import type { StudentRepositoryPort } from "../../domain/ports/student.repository.ports";
import type { ClassesRepositoryPort } from "../../domain/ports/classes.repository.ports";
import { EnrollGroupStudentRow } from "../../infrastructure/http/dtos/enroll-group-student.dto";
import { NotFoundError } from "../../../../shared/handler/errors";
import { CreateStudentProfileUseCase } from "./create-student-profile.usecase";

@Injectable()
export class EnrollGroupStudentUseCase {
    private readonly logger = new Logger(EnrollGroupStudentUseCase.name);

    constructor(
        @Inject(ENROLLMENT_REPO) private readonly enrollmentRepo: EnrollmentRepositoryPort,
        @Inject(STUDENT_REPO) private readonly studentRepo: StudentRepositoryPort,
        @Inject(CLASSES_REPO) private readonly classesRepo: ClassesRepositoryPort,
        private readonly createStudent: CreateStudentProfileUseCase,
    ) {}

    async execute(input: { classId: string, studentRows: EnrollGroupStudentRow[] }) {
        const ojbClass = await this.classesRepo.findById(input.classId);
        if (!ojbClass) {
            this.logger.error(`Class not found with ID ${input.classId}`);
            throw new NotFoundError(`No se ha podido recupear la información del período académico`);
        }

        let totalRows = input.studentRows.length, errorRows = 0, existingRows = 0, successRows = 0
        for (const row of input.studentRows) {
            try {
                let student = await this.studentRepo.findByCode(row.studentCode);
                if (!student) {
                    this.logger.log(`Student not found with code ${row.studentCode}, creating new user`);
                    const rowData = {
                        studentName: row.studentName,
                        studentLastname: row.studentLastname,
                        studentCode: row.studentCode
                    }
                    student = await this.createStudent.execute(rowData);
                    this.logger.log(student)
                }

                const existingEnrollment = await this.enrollmentRepo.findByStudentAndClass(student.userId, input.classId);

                if (existingEnrollment) {
                    if (!existingEnrollment.isActive) {
                        await this.enrollmentRepo.enableEnrollment(student.userId,input.classId);
                        successRows++;
                    } else {
                        existingRows++;
                    }
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
        return { totalRows, errorRows, existingRows, successRows };
    }
}
