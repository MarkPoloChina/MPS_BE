import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Tag } from './tag.entity';
import { Blog } from './blog.entity';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(Blog)
    private readonly blogRepository: Repository<Blog>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {}

  async getAllTags(): Promise<Tag[]> {
    const loadTree = async (parentTag: Tag) => {
      const tags = await this.tagRepository.findBy(
        parentTag ? { parent: parentTag } : { level: 0 },
      );
      for (const tag of tags) {
        tag.children = await loadTree(tag);
      }
      return tags;
    };

    return await loadTree(null);
  }

  async getTagById(tagId: number): Promise<Tag> {
    const loadChain = async (childTag: Tag) => {
      const tag = await this.tagRepository.findOneBy(
        childTag
          ? {
              children: [childTag],
            }
          : {
              id: tagId,
            },
      );
      if (!tag) return null;
      tag.parent = await loadChain(tag);
      return tag;
    };

    return await loadChain(null);
  }

  async getBlogsUnderTag(tagId: number, pageSize: number = 50, offset: number = 0): Promise<Blog[]> {
    const blogIds = await this.blogRepository
      .createQueryBuilder('blog')
      .leftJoin('blog.tags', 'tag')
      .where('tag.id = :tagId', { tagId })
      .select('blog.id')
      .getMany();

    const blogs = await this.blogRepository.find({
      where: {
        id: In(blogIds.map((blog) => blog.id)),
      },
      relations: {
        tags: true,
      },
      order: {
        fileDate: 'DESC',
      },
      take: pageSize,
      skip: offset,
    });

    return blogs;
  }

  async getLatestBlogs(pageSize: number = 50, offset: number = 0): Promise<Blog[]> {
    return await this.blogRepository.find({
      order: {
        fileDate: 'DESC',
      },
      relations: {
        tags: true,
      },
      take: pageSize,
      skip: offset,
    });
  }

  async getBlogById(blogId: number): Promise<Blog> {
    return await this.blogRepository.findOne({
      where: {
        id: blogId,
      },
      relations: {
        tags: true,
      },
    });
  }
}
