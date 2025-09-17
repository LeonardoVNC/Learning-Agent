import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { RbacModule } from './modules/rbac/rbac.module';
import { IdentityModule } from './modules/identity/identity.module';
import { DocumentsModule } from './modules/repository_documents/documents.module';
import { AcademicManagementModule } from './modules/academic_management/academic_management.module';
import { ExamsModule } from './modules/exams/exams.module';
import { AiConfigService } from './core/ai/ai.config';
import { InterviewModule } from './modules/interviewChat/interview.module';
import { ReinforcementModule } from './modules/reinforcement/reinforcement.module';
import { ExamsChatModule } from './modules/exams-chat/exams-chat.module';



@Module({
  imports: [
    RbacModule,
    IdentityModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AcademicManagementModule,
    ExamsModule,
    DocumentsModule,
    InterviewModule,
    ReinforcementModule,
    ExamsChatModule,


  ],
  controllers: [AppController],
  providers: [AiConfigService, AppService],
})
export class AppModule {}
