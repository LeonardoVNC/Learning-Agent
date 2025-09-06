import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENROLLMENT_REPO, STUDENT_REPO, CLASSES_REPO, USER_REPO, HASHER, ROLE_REPO } from "../../tokens";
import type { EnrollmentRepositoryPort } from "../../domain/ports/enrollment.repository.ports";
import type { StudentRepositoryPort } from "../../domain/ports/student.repository.ports";
import type { ClassesRepositoryPort } from "../../domain/ports/classes.repository.ports";
import type { UserRepositoryPort } from "src/modules/identity/domain/ports/user.repository.port";
import type  { RoleRepositoryPort } from "src/modules/rbac/domain/ports/role.repository.port";
import { AlreadyCreatedError, InternalServerError, NotFoundError } from "src/shared/handler/errors";
import { BcryptHasher } from "src/modules/identity/infrastructure/crypto/bcrypt.hasher";

@Injectable()
export class EnrollSingleStudentUseCase {
    private readonly logger = new Logger(EnrollSingleStudentUseCase.name)
    constructor(
        @Inject(ENROLLMENT_REPO) private readonly enrollmentRepo: EnrollmentRepositoryPort,
        @Inject(STUDENT_REPO) private readonly studentRepo: StudentRepositoryPort,
        @Inject(CLASSES_REPO) private readonly classesRepo: ClassesRepositoryPort,
        @Inject(USER_REPO) private readonly userRepo: UserRepositoryPort,
        @Inject(HASHER) private readonly hasher: BcryptHasher,
        @Inject(ROLE_REPO) private readonly roleRepo: RoleRepositoryPort,
    ) {}

    async execute(input: { studentName: string; studentLastname: string; studentCode: string; classId: string }) {
        const ojbClass = await this.classesRepo.findById(input.classId);
        if (!ojbClass) {
            this.logger.error(`Class not found with ID ${input.classId}`)
            throw new NotFoundError(`No se ha podido recupear la información de la clase`)
        }
        
        let student = await this.studentRepo.findByCode(input.studentCode);
        if (!student) {
            this.logger.log(`Student not found with code ${input.studentCode}, creating new user:`);
            student = await this.handleNewUser(input.studentName, input.studentLastname, input.studentCode);
            this.logger.log(student)
        }

        const existingEnrollments = await this.enrollmentRepo.findByStudentId(student.userId);
        if (existingEnrollments.some(enrollment => enrollment.classId === input.classId)) {
            throw new AlreadyCreatedError(`Este estudiante ya se encuentra inscrito en la clase`)
        }

        const enrollment = await this.enrollmentRepo.create(student.userId, input.classId);
        return enrollment;
    }

    async handleNewUser(studentName: string, studentLastname: string, studentCode: string) {
        const studentRole = await this.roleRepo.findByName('estudiante')
        const studentRoleId = studentRole?.id
        if (!studentRole || !studentRoleId) {
            this.logger.error("Error fetching studentRoleId single enrollment endpoint")
            throw new InternalServerError("Error creando al usuario");
        }
        
        const password = `${this.fixedString(studentLastname+studentCode)}UPB2025`
        const hash = await this.hasher.hash(password)

        const newUser = await this.userRepo.create(
            studentName,
            studentLastname,
            `${this.fixedString(studentName + studentLastname + studentCode)}@upb.edu`,
            hash,
            true,
            studentRoleId,
        );
        
        if (!newUser) {
            this.logger.error("Error creating new user on single enrollment endpoint")
            throw new InternalServerError("Error creando el usuario");
        }

        const newStudent = await this.studentRepo.create(newUser.id, studentCode);
        if (!newStudent) {
            this.logger.error("Error creating new student on single enrollment endpoint")
            throw new InternalServerError("Error creando la cuenta del estudiante");
        }
        return newStudent;
    }

    fixedString(s: string): string {
        return s.trim().toLowerCase().replace(/\s+/g, '');
    }
}   