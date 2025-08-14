export class Classes {
    constructor (
        public readonly id: string,
        public name: string,
        public semester: string,
        public teacherId: string,
        public isActive: boolean,
        public dateBegin: Date,
        public dateEnd: Date,
    ) {}
}