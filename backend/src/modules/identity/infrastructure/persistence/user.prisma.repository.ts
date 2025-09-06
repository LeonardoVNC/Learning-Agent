import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class UserPrismaRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) { }

  async findById(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user
      ? new User(
        user.id,
        user.email,
        user.name,
        user.lastname,
        user.password,
        user.isActive,
      )
      : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const u = await this.prisma.user.findUnique({ where: { email } });
    return u
      ? new User(u.id, u.email, u.name, u.lastname, u.password, u.isActive)
      : null;
  }

  async create(name: string, lastname: string, email: string, passwordHash: string, isActive?: boolean): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        name,
        lastname,
        email,
        password: passwordHash,
        isActive
      }
    });
    return new User(
      user.id,
      user.email,
      user.name,
      user.lastname,
      user.password,
      user.isActive,
    )
  }

  async update(userId: string, name?: string, lastname?: string, email?: string, passwordHash?: string, isActive?: boolean): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name,
        lastname,
        email,
        password: passwordHash,
        isActive
      }
    })
    return new User(
      user.id,
      user.email,
      user.name,
      user.lastname,
      user.password,
      user.isActive,
    )
  }

  async delete(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: userId }});
  }
}
