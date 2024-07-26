import { Logger, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskService } from './blog-task.service';
import { Blog } from './blog.entity';
import { Tag } from './tag.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';

@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([Blog, Tag])],
  providers: [
    TaskService,
    BlogService,
    {
      provide: 'TaskLogger',
      useFactory: () => {
        return new Logger('BlogTask');
      },
    },
  ],
  controllers: [BlogController],
})
export class BlogModule {}
