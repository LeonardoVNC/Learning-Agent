export class Teacher {
  constructor(
    public readonly userId: string,
    public academicUnit?: string,
    public title?: string,
    public bio?: string,
  ) {}
}