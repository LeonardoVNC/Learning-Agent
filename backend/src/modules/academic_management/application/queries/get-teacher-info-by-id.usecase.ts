import { Inject, Injectable, Logger } from "@nestjs/common";
import { TEACHER_REPO, USER_REPO } from "../../tokens";
import type { UserRepositoryPort } from "src/modules/identity/domain/ports/user.repository.port";
import type { ProfessorRepositoryPort } from "../../domain/ports/teacher.repository.ports";
import { TeacherInfoDTO } from "../../infrastructure/http/dtos/response.teacher-info.dto";
import { NotFoundError } from "src/shared/handler/errors";

@Injectable()
export class GetTeacherInfoByIDUseCase {
    private readonly logger = new Logger(GetTeacherInfoByIDUseCase.name)
    constructor(
        @Inject(USER_REPO) private readonly userRepo: UserRepositoryPort,
        @Inject(TEACHER_REPO) private readonly teacherRepo: ProfessorRepositoryPort
    ){}

    async execute(teacherID: string): Promise<TeacherInfoDTO> {
        const teacher = await this.teacherRepo.findByUserId(teacherID);
        if (!teacher) {
            this.logger.error(`Teacher not found with ID ${teacherID}`)
            throw new NotFoundError(`No se ha podido recuperar la información del Docente`)
        }

        const user = await this.userRepo.findById(teacher.userId);
        if (!user) {
            this.logger.error(`User not found with ID ${teacher.userId}`);
            throw new NotFoundError(`No se ha podido recuperar la información del docente`);
        }

        const data = {
            userId: teacher.userId,
            name: user.name,
            lastname: user.lastname,
            email: user.email,
            isActive: user.isActive,
            academicUnit: teacher.academicUnit,
            title: teacher.title,
            bio: teacher.bio
        }

        return data;
    }
}