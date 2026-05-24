import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { EvaluateNotificationDto } from '../application/dto/evaluate-notification.dto';
import { EvaluationResultDto } from '../application/dto/evaluation-result.dto';
import { UpsertPreferencesDto } from '../application/dto/upsert-preferences.dto';
import { NotificationPolicyEvaluator } from '../application/services/notification-policy-evaluator.service';
import { PreferencesService } from '../application/services/preferences.service';

@ApiTags('Preferences')
@Controller()
export class PreferencesController {
  constructor(
    private readonly preferencesService: PreferencesService,
    private readonly evaluator: NotificationPolicyEvaluator,
  ) {}

  @Get('users/:id/preferences')
  @ApiOperation({ summary: 'Get all preferences for a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOkResponse({ description: 'List of user preferences' })
  async getPreferences(@Param('id') userId: string) {
    return this.preferencesService.getPreferences(userId);
  }

  @Post('users/:id/preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert preferences for a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpsertPreferencesDto })
  @ApiOkResponse({ description: 'Updated preferences' })
  async upsertPreferences(@Param('id') userId: string, @Body() dto: UpsertPreferencesDto) {
    return this.preferencesService.upsertPreferences(userId, dto);
  }

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate whether a notification should be sent' })
  @ApiBody({ type: EvaluateNotificationDto })
  @ApiOkResponse({ type: EvaluationResultDto, description: 'Evaluation decision' })
  async evaluate(@Body() dto: EvaluateNotificationDto): Promise<EvaluationResultDto> {
    return this.evaluator.evaluate(dto);
  }
}
