import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { StudentRepositoryPort } from '../../domain/ports/student.repository.ports';
import { Student } from '../../domain/entities/student.entity';

@Injectable()
export class StudentPrismaRepository implements StudentRepositoryPort {
    constructor(private readonly prisma: PrismaService) { }

    async findByUserId(userId: string): Promise<Student | null> {
        const student = await this.prisma.studentProfile.findUnique({ where: { userId } });
        if (!student) return null;
        return new Student(
            student.userId,
            student.code,
            student.career || undefined,
            student.admissionYear || undefined
        );
    };

    async create(userId: string, code: number, career?: string, admissionYear?: number): Promise<Student> {
        const newStudent = await this.prisma.studentProfile.create({
            data: {
                userId,
                code,
                career,
                admissionYear
            }
        });
        return new Student(
            newStudent.userId,
            newStudent.code,
            newStudent.career || undefined,
            newStudent.admissionYear || undefined
        );
    }

    async list(): Promise<Student[]> {
        const rows = await this.prisma.studentProfile.findMany();
        return rows.map((s) => new Student(
            s.userId,
            s.code,
            s.career || undefined,
            s.admissionYear || undefined
        ));
    };
}