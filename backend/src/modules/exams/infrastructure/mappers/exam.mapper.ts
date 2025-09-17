import { Exam } from '../../domain/entities/exam.entity';
import { ExamStatus } from '../../domain/constants/exam.constants';

export class ExamMapper {
    static toPersistence(exam: Exam) {
        return {
            id: exam.id,
            title: exam.title,
            status: exam.status as ExamStatus,
            classId: exam.classId,
            difficulty: exam.difficulty.getValue(),
            attempts: exam.attempts.getValue(),
            timeMinutes: exam.timeMinutes.getValue(),
            reference: exam.reference,
            createdAt: exam.createdAt,
            updatedAt: exam.updatedAt,
        };
    }

    static toDomain(raw: {
        id: string;
        title: string;
        status: ExamStatus;
        classId: string;
        difficulty: string;
        attempts: number;
        timeMinutes: number;
        reference: string | null;
        createdAt: Date;
        updatedAt: Date;
    }): Exam {
        return Exam.rehydrate(raw);
    }
}
