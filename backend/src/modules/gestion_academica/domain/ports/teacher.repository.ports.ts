import { Teacher } from "../entities/teacher.entity";
export interface ProfessorRepositoryPort {
    findByUserId(userId: string): Promise<Teacher | null>;
    create(
        userId: string,
        academicUnit?: string,
        title?: string,
        bio?: string,
    ): Promise<Teacher>;
    list(): Promise<Teacher[]>;
}
