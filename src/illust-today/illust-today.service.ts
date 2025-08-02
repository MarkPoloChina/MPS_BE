import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IllustToday } from './illust-today.entity';
import { IllustTodayDTO } from './illust-today.dto';
import { RemoteBase } from './remote-base.entity';

@Injectable()
export class IllustTodayService {
  constructor(
    @InjectRepository(IllustToday)
    private readonly illustTodayRepository: Repository<IllustToday>,
    @InjectRepository(RemoteBase)
    private readonly remoteBaseRepository: Repository<RemoteBase>,
  ) {}

  async findOneByDate(date: string): Promise<IllustToday> {
    return await this.illustTodayRepository.findOneByOrFail({
      date,
    });
  }

  async findOneLatest(): Promise<IllustToday> {
    return await this.illustTodayRepository
      .createQueryBuilder()
      .orderBy('date', 'DESC')
      .getOne();
  }

  async findLatest(offset: number, limit: number): Promise<IllustToday[]> {
    return await this.illustTodayRepository
      .createQueryBuilder()
      .orderBy('date', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();
  }

  async findValid(offset: number, limit: number): Promise<string[]> {
    if (limit <= 0)
      return (
        await this.illustTodayRepository
          .createQueryBuilder()
          .select('date')
          .orderBy('date', 'DESC')
          .getRawMany()
      ).map((item) => item.date);
    return (
      await this.illustTodayRepository
        .createQueryBuilder()
        .select('date')
        .orderBy('date', 'DESC')
        .skip(offset)
        .take(limit)
        .getRawMany()
    ).map((item) => item.date);
  }

  async findOnePre(date: string): Promise<IllustToday> {
    return await this.illustTodayRepository
      .createQueryBuilder()
      .where('date < :givenDate', { givenDate: date })
      .orderBy('date', 'DESC')
      .getOne();
  }

  async findOneNext(date: string): Promise<IllustToday> {
    return await this.illustTodayRepository
      .createQueryBuilder()
      .where('date > :givenDate', { givenDate: date })
      .orderBy('date', 'ASC')
      .getOne();
  }

  async updateByDate(date: string, dto: IllustTodayDTO): Promise<IllustToday> {
    let targetIllustToday = await this.illustTodayRepository.findOneBy({
      date: date,
    });
    if (!targetIllustToday) {
      targetIllustToday = new IllustToday();
      targetIllustToday.date = date;
    }

    targetIllustToday.type = dto.type;

    let targetBase = await this.remoteBaseRepository.findOneBy({
      name: dto.type,
    });
    if (!targetBase) {
      targetBase = new RemoteBase();
      targetBase.name = dto.type;
    }
    targetBase.target = dto.base;
    await this.remoteBaseRepository.save(targetBase);

    targetIllustToday.target = dto.target;

    targetIllustToday.char = dto.char || null;
    targetIllustToday.source = dto.source || null;
    if (dto.tags && dto.tags.length !== 0)
      targetIllustToday.tags = dto.tags.toString();
    return await this.illustTodayRepository.save(targetIllustToday);
  }

  async getRemoteBase(type: string): Promise<RemoteBase> {
    const targetBase = await this.remoteBaseRepository.findOneByOrFail({
      name: type,
    });
    return targetBase;
  }
}
