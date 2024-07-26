import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IllustTodayModule } from './illust-today/illust-today.module';
import { BlogModule } from './blog/blog.module';

@Module({
  imports: [
    IllustTodayModule,
    BlogModule,
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'main.db',
      autoLoadEntities: true,
      synchronize: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
