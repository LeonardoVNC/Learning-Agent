import { Inject, Injectable } from '@nestjs/common';
import { USER_REPO } from '../../tokens';
import { STUDENT_REPO } from '../../tokens';
import type { UserRepositoryPort } from "src/modules/identity/domain/ports/user.repository.port";
import type { StudentRepositoryPort } from '../../domain/ports/student.repository.ports';
import { Student } from '../../domain/entities/student.entity'

@Injectable()
export class CreateStudentProfileUseCase {
  constructor(
    @Inject(USER_REPO) private readonly userRepo: UserRepositoryPort,
    @Inject(STUDENT_REPO) private readonly studentRepo: StudentRepositoryPort,
  ) { }
  async execute(input: {
    name: string,
    lastname: string,
    email: string,
    password: string,
    isActive?: boolean,
    code: string,
    career?: string,
    admissionYear?: number
  }): Promise<Student> {
    const existingStudent = await this.studentRepo.findByCode(input.code);
    if (existingStudent) {
      return existingStudent;
    }
    let user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      user = await this.userRepo.create(
        input.name,
        input.lastname,
        input.email,
        input.password,
        input.isActive ?? true
      );
    }
    const newStudent = await this.studentRepo.create(
      user.id,
      input.code,
      input.career,
      input.admissionYear
    );

    return newStudent;
  }
}
