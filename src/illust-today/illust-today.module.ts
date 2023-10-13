import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IllustToday } from './illust-today.entity';
import { IllustTodayService } from './illust-today.service';
import { IllustTodayController } from './illust-today.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IllustToday])],
  providers: [IllustTodayService],
  controllers: [IllustTodayController],
})
export class IllustTodayModule {}
