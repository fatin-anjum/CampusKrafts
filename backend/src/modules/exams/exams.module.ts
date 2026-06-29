import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { CoursesModule } from '../courses/courses.module';
import { AdaptiveModule } from '../adaptive/adaptive.module';

@Module({
  imports: [CoursesModule, AdaptiveModule],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
