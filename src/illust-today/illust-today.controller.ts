import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IllustToday } from './illust-today.entity';
import { IllustTodayService } from './illust-today.service';
import { IllustTodayDTO } from './illust-today.dto';

@Controller('v1/illust-today')
export class IllustTodayController {
  constructor(private readonly illustTodayService: IllustTodayService) {}

  @Get('latest')
  async findOneLatest(): Promise<IllustToday> {
    return this.illustTodayService.findOneLatest();
  }

  @Get('pre/:date')
  async findOnePre(@Param('date') date: string): Promise<IllustToday> {
    return this.illustTodayService.findOnePre(date);
  }

  @Get('next/:date')
  async findOneNext(@Param('date') date: string): Promise<IllustToday> {
    return this.illustTodayService.findOneNext(date);
  }

  @Get(':date')
  async findOne(@Param('date') date: string): Promise<IllustToday> {
    return this.illustTodayService.findOneByDate(date);
  }

  @Post(':date')
  async update(
    @Param('date') date: string,
    @Body() dto: IllustTodayDTO,
  ): Promise<IllustToday> {
    return this.illustTodayService.updateByDate(date, dto);
  }
}
