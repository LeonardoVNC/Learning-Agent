import { Classes } from "../entities/classes.entity";
export interface ClassesRepositoryPort {
    findById(id: string): Promise<Classes | null>;
    findByTeacherId(teacherId: string): Promise<Classes[]>;
    create(
        name: string, 
        semester: string, 
        teacherId: string,
        dateBegin: Date,
        dateEnd: Date
    ): Promise<Classes>;
    list(): Promise<Classes[]>;
}