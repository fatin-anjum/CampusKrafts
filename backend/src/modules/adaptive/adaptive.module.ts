import { Module } from '@nestjs/common';
import { AdaptiveController } from './adaptive.controller';
import { AdaptiveService } from './adaptive.service';

@Module({
  controllers: [AdaptiveController],
  providers: [AdaptiveService],
  exports: [AdaptiveService],
})
export class AdaptiveModule {}
