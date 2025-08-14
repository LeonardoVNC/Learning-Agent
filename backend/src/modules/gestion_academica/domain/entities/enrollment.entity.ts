export class Enrollment {
    constructor(
        public readonly studentId: string,
        public readonly classId: string,
        public isActive: boolean,
    ) {}
}