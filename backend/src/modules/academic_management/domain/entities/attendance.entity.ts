export class Attendance {
    constructor(
        public readonly id: string,
        public readonly studentId: string,
        public readonly classId: string,
        public date: Date,
        public isPresent: boolean,
    ) {}
}