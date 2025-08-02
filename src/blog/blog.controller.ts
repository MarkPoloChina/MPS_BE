import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { BlogService } from './blog.service';
import { Blog } from './blog.entity';
import { Tag } from './tag.entity';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get('latest')
  async getLatest(@Query('pageSize') pageSize: string, @Query('offset') offset: string): Promise<Blog[]> {
    return this.blogService.getLatestBlogs(parseInt(pageSize), parseInt(offset));
  }

  @Get('tags')
  async getAllTags(): Promise<Tag[]> {
    return this.blogService.getAllTags();
  }

  @Get(':blogId')
  async findOneById(@Param('blogId') blogId: string): Promise<Blog> {
    return this.blogService.getBlogById(parseInt(blogId));
  }

  @Get('under_tag/:tagId')
  async getBlogUnderTag(@Param('tagId') tagId: string, @Query('pageSize') pageSize: string, @Query('offset') offset: string): Promise<Blog[]> {
    return this.blogService.getBlogsUnderTag(parseInt(tagId), parseInt(pageSize), parseInt(offset));
  }

  @Get('tag/:tagId')
  async getTag(@Param('tagId') tagId: string): Promise<Tag> {
    return this.blogService.getTagById(parseInt(tagId));
  }
}
