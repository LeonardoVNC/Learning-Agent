import { User } from '../entities/user.entity';

export interface UserRepositoryPort {
  findById(userId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(
    name: string,
    lastname: string,
    email: string,
    passwordHash: string,
    isActive?: boolean,
    roleId?: string,
  ): Promise<User>;
  update(
    userId: string,
    name?: string,
    lastname?: string,
    email?: string,
    passwordHash?: string,
    isActive?: boolean,
  ): Promise<User>;
  delete(userId: string): Promise<void>;
}
