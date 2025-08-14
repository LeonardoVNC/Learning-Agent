import { Student } from "../entities/student.entity";
export interface StudentRepositoryPort {
    findByUserId(userId: string): Promise<Student | null>;
    create(
        userId: string,
        code: number,
        career?: string,
        admissionYear?: number,
    ): Promise<Student>;
    list(): Promise<Student[]>;
}