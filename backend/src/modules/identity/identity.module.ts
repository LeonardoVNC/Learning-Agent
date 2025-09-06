import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthController } from './infrastructure/http/auth.controller';
import { LoginUseCase } from './application/commands/login.usecase';
import { RefreshUseCase } from './application/commands/refresh.usecase';
import { LogoutUseCase } from './application/commands/logout.usecase';
import {
  USER_REPO,
  SESSION_REPO,
  HASHER,
  TOKEN_SERVICE,
  AUTHZ_PORT,
} from './tokens';
import { UserPrismaRepository } from './infrastructure/persistence/user.prisma.repository';
import { SessionPrismaRepository } from './infrastructure/persistence/session.prisma.repository';
import { BcryptHasher } from './infrastructure/crypto/bcrypt.hasher';
import { JwtTokenService } from './infrastructure/jwt/jwt.token.service';
import { GetMeUseCase } from './application/queries/get-me.usecase';
import { JwtStrategy } from './infrastructure/http/jwt.strategy';
import { RbacAuthzAdapter } from './infrastructure/authz/rbac-authz.adapter';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [PrismaModule, forwardRef(() => RbacModule)],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RefreshUseCase,
    LogoutUseCase,
    GetMeUseCase,
    JwtStrategy,
    { provide: USER_REPO, useClass: UserPrismaRepository },
    { provide: SESSION_REPO, useClass: SessionPrismaRepository },
    { provide: HASHER, useClass: BcryptHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    RbacAuthzAdapter,
    { provide: AUTHZ_PORT, useClass: RbacAuthzAdapter },
  ],
  exports: [TOKEN_SERVICE, USER_REPO, HASHER],
})
export class IdentityModule {}
