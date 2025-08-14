import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { EnrollmentRepositoryPort } from '../../domain/ports/enrollment.repository.ports';
import { Enrollment } from '../../domain/entities/enrollment.entity';

@Injectable()
export class EnrollmentPrismaRepository implements EnrollmentRepositoryPort {
    constructor(private readonly prisma: PrismaService) { }

    async findByStudentId(studentId: string): Promise<Enrollment[]> {
        const enrollmentData = await this.prisma.enrollment.findMany({ where: { studentId } });
        if (!enrollmentData) return [];
        return enrollmentData.map(e => new Enrollment(
            e.studentId,
            e.classId,
            e.isActive
        ));
    };

    async findByClassId(classId: string): Promise<Enrollment[]> {
        const enrollmentData = await this.prisma.enrollment.findMany({ where: { classId } });
        if (!enrollmentData) return [];
        return enrollmentData.map(e => new Enrollment(
            e.studentId,
            e.classId,
            e.isActive
        ));
    };

    async create(studentId: string, classId: string): Promise<Enrollment> {
        const newEnrollment = await this.prisma.enrollment.create({
            data: {
                studentId,
                classId,
                isActive: true
            }
        });
        return new Enrollment(
            newEnrollment.studentId,
            newEnrollment.classId,
            newEnrollment.isActive
        );
    }

    async list(): Promise<Enrollment[]> {
        const rows = await this.prisma.enrollment.findMany();
        return rows.map((e) => new Enrollment(
            e.studentId,
            e.classId,
            e.isActive
        ));
    };


}