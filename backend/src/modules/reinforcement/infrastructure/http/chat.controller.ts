import { Body, Controller, HttpCode, Post } from '@nestjs/common';

import { ChatRequest } from './dto/chat-request';
import { ChatResponse } from './dto/response';
import { DsService } from '../ds.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly dsService: DsService) {}

  @Post()
  @HttpCode(200)
  async chatWithIA(@Body() dto: ChatRequest): Promise<ChatResponse> {
    const response = await this.dsService.generateResponse(dto.question);
    return response;
  }
}
