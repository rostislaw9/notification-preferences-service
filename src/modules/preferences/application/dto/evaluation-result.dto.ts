import { ApiProperty } from '@nestjs/swagger';
import { Decision } from '../../domain/enums/decision.enum';

export class EvaluationResultDto {
  @ApiProperty({ enum: Decision, example: Decision.Allow })
  decision!: Decision;

  @ApiProperty({ example: 'User preference allows this notification' })
  reason!: string;
}
