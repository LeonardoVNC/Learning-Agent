import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ROLE_REPO, PERM_REPO } from './tokens';
import { RolePrismaRepository } from './infrastructure/persistence/role.prisma.repository';
import { PermissionPrismaRepository } from './infrastructure/persistence/permission.prisma.repository';
import { CreateRoleUseCase } from './application/commands/create-role.usecase';
import { CreatePermissionUseCase } from './application/commands/create-permission.usecase';
import { AttachPermissionUseCase } from './application/commands/attach-permission.usecase';
import { ListRolesUseCase } from './application/queries/list-roles.usecase';
import { ListPermissionsUseCase } from './application/queries/list-permissions.usecase';
import { RbacController } from './infrastructure/http/rbac.controller';
import { GetRolesForUserUseCase } from './application/queries/get-roles-for-user.usecase';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [PrismaModule, IdentityModule],
  controllers: [RbacController],
  providers: [
    { provide: ROLE_REPO, useClass: RolePrismaRepository },
    { provide: PERM_REPO, useClass: PermissionPrismaRepository },
    JwtAuthGuard,
    CreateRoleUseCase,
    CreatePermissionUseCase,
    AttachPermissionUseCase,
    ListRolesUseCase,
    ListPermissionsUseCase,
    GetRolesForUserUseCase,
  ],
  exports: [GetRolesForUserUseCase, ROLE_REPO],
})
export class RbacModule {}
