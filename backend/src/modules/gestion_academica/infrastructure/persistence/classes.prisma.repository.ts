import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../../core/prisma/prisma.service";
import { ClassesRepositoryPort } from "../../domain/ports/classes.repository.ports";
import { Classes } from "../../domain/entities/classes.entity";

@Injectable()
export class ClassesPrismaRepository implements ClassesRepositoryPort {
    constructor(private readonly prisma: PrismaService) { }

    async findById(id: string): Promise<Classes | null> {
        const classesData = await this.prisma.classes.findUnique({ where: { id } });
        if (!classesData) return null;
        return new Classes(
            classesData.id,
            classesData.name,
            classesData.semester,
            classesData.teacherId,
            classesData.isActive,
            new Date(classesData.dateBegin),
            new Date(classesData.dateEnd)
        )
    }

    async findByTeacherId(teacherId: string): Promise<Classes[]> {
        const classesData = await this.prisma.classes.findMany({ where: { teacherId } });
        if (!classesData) return [];
        return classesData.map(c => new Classes(
            c.id,
            c.name,
            c.semester,
            c.teacherId,
            c.isActive,
            new Date(c.dateBegin),
            new Date(c.dateEnd)
        ));
    };

    async create(name: string, semester: string, teacherId: string, dateBegin: Date, dateEnd: Date): Promise<Classes> {
        const newClass = await this.prisma.classes.create({
            data: {
                name,
                semester,
                teacherId,
                isActive: true,
                dateBegin,
                dateEnd
            }
        });
        return new Classes(
            newClass.id,
            newClass.name,
            newClass.semester,
            newClass.teacherId,
            newClass.isActive,
            new Date(newClass.dateBegin),
            new Date(newClass.dateEnd)
        );
    }

    async list(): Promise<Classes[]> {
        const rows = await this.prisma.classes.findMany({ orderBy: { name: 'asc' } });
        return rows.map((c) => new Classes(
            c.id,
            c.name,
            c.semester,
            c.teacherId,
            c.isActive,
            new Date(c.dateBegin),
            new Date(c.dateEnd)
        ));
    }

}