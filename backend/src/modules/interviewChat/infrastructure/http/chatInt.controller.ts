import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  DoubleOptionResponse,
  MultipleSelectionResponse,
} from 'src/modules/reinforcement/infrastructure/http/dto/response';
import { DsIntService } from '../dsInt.service';
import { ChatAnswer } from './dto/generate-advice';
import { QuestionResponse } from './dto/question-response';

interface CoachingResponse {
  generated_question: string;
  user_response: string;
  coaching_advice: string;
}

@Controller('chatint')
export class ChatIntController {
  constructor(private readonly dsService: DsIntService) {}
  @Get('question')
  async generateQuestion(
    @Query('topico') topico: string,
  ): Promise<QuestionResponse> {
    console.log('topico:', topico);
    return this.dsService.generateQuestion(topico);
  }

  // Get advice for an answer
  @Post('advice')
  async generateAdvice(
    @Body() chatAnswer: ChatAnswer,
  ): Promise<CoachingResponse> {
    console.log('answer:', chatAnswer);
    const respDs = await this.dsService.generateAdvise(
      chatAnswer.question,
      chatAnswer.answer,
      chatAnswer.topic,
    );
    return respDs;
  }
  @Get('multipleSelection')
  async generateMultipleSelection(
    @Query('topico') topico: string,
  ): Promise<MultipleSelectionResponse> {
    return await this.dsService.generateMultipleSelection(topico);
  }
  @Get('doubleOption')
  async generateDoubleOption(
    @Query('topico') topico: string,
  ): Promise<DoubleOptionResponse> {
    return await this.dsService.generatedoubleOption(topico);
  }
}
