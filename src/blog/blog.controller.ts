import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { BlogService } from './blog.service';
import { Blog } from './blog.entity';
import { Tag } from './tag.entity';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get('latest')
  async getLatest(): Promise<Blog[]> {
    return this.blogService.getLatestBlogs();
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
  async getBlogUnderTag(@Param('tagId') tagId: string): Promise<Blog[]> {
    return this.blogService.getBlogsUnderTag(parseInt(tagId));
  }

  @Get('tag/:tagId')
  async getTag(@Param('tagId') tagId: string): Promise<Tag> {
    return this.blogService.getTagById(parseInt(tagId));
  }
}
