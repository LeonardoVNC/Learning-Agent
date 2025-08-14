import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { ProfessorRepositoryPort } from '../../domain/ports/teacher.repository.ports';
import { Teacher } from '../../domain/entities/teacher.entity';

@Injectable()
export class TeacherPrismaRepository implements ProfessorRepositoryPort {
    constructor(private readonly prisma: PrismaService) {};

    async findByUserId(userId: string): Promise<Teacher | null> {
        const teacher = await this.prisma.teacherProfile.findUnique({ where: { userId } });
        if (!teacher) return null;
        return new Teacher(
            teacher.userId,
            teacher.academicUnit || undefined,
            teacher.title || undefined,
            teacher.bio || undefined
        );
    }

    async create(userId: string, academicUnit?: string, title?: string, bio?: string): Promise<Teacher> {
        const newTeacher = await this.prisma.teacherProfile.create({
            data: {
                userId,
                academicUnit,
                title,
                bio
            }
        });
        return new Teacher(
            newTeacher.userId,
            newTeacher.academicUnit || undefined,
            newTeacher.title || undefined,
            newTeacher.bio || undefined
        );
    };

    async list(): Promise<Teacher[]> {
        const rows = await this.prisma.teacherProfile.findMany();
        return rows.map((t) => new Teacher(
            t.userId,
            t.academicUnit || undefined,
            t.title || undefined,
            t.bio || undefined
        ))
    };
    
}