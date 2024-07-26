import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Blog } from './blog.entity';
import { Tag } from './tag.entity';
import { Repository } from 'typeorm';
interface AlistResponseData {
  content: {
    name: string;
    size: number;
    is_dir: boolean;
    modified: Date;
    created: Date;
    sign: string;
    thumb: string;
    type: number;
  }[];
  total: number;
  readme: string;
  header: string;
  write: boolean;
  provider: string;
}

@Injectable()
export class TaskService {
  ALIST_API_URL = 'https://alist.markpolo.cn/api/fs/list';
  ALIST_ROOT = '/Public/MPS/Notes';

  constructor(
    @InjectRepository(Blog)
    private readonly blogRepository: Repository<Blog>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @Inject('TaskLogger')
    private readonly logger: Logger,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    try {
      const cnt = await this.sync_dir('');
      const cnt_removed = await this.sync_db();
      this.logger.log(
        `Sync added/updated ${cnt}, removed ${cnt_removed} blog(s) done`,
      );
    } catch (e) {
      this.logger.error(`Sync failed with error: ${e}`);
    }
  }

  @Timeout(5000)
  handleCronInit() {
    this.handleCron();
  }

  async api_get_list(dir: string) {
    const { data } = await axios.post(this.ALIST_API_URL, {
      path: `${this.ALIST_ROOT}${dir}`,
      page: 1,
      per_page: 0,
      password: '',
      refresh: false,
    });
    if (data.code === 200) return data.data as AlistResponseData;
    else if (
      data.code === 500 &&
      data.message === 'failed get objs: failed get dir: object not found'
    )
      return null;
    else throw new Error('api_get_list failed with code ' + data.code);
  }

  async sync_dir(dir: string) {
    let updateCnt = 0;
    const alistDir = await this.api_get_list(dir);
    const dirs = alistDir.content.filter((item) => item.is_dir);
    const mds = alistDir.content.filter(
      (item) => !item.is_dir && item.name.endsWith('.md'),
    );
    const isImage = (name: string) =>
      ['.jpg', '.jpeg', '.png', '.gif'].some((ext) => name.endsWith(ext));
    const pics = alistDir.content.filter(
      (item) => !item.is_dir && isImage(item.name),
    );
    for (const subDir of dirs) {
      const cnt = await this.sync_dir(`${dir}/${subDir.name}`);
      updateCnt += cnt;
    }
    const tagsFromPath = dir.split('/').filter((item) => item);
    const tagsToAdd: Tag[] = [];
    for (const tag of tagsFromPath) {
      let tagObj = await this.tagRepository.findOneBy({ name: tag });
      if (!tagObj) {
        tagObj = new Tag();
        tagObj.name = tag;
        tagObj.level = tagsFromPath.indexOf(tag);
        tagObj.parent = tagsToAdd[tagsFromPath.indexOf(tag) - 1] || null;
      }
      tagsToAdd.push(tagObj);
    }
    for (const md of mds) {
      const title = md.name.replace(/\.md$/, '');
      const imgFile = pics.find((item) =>
        ['.jpg', '.jpeg', '.png', '.gif'].some(
          (ext) => item.name === `${title}${ext}`,
        ),
      )?.name;
      const dict = {
        title: title,
        target: `${dir}/${md.name}`,
        imgTarget: imgFile ? `${dir}/${imgFile}` : null,
        type: 'md',
        tags: tagsToAdd,
        fileDate: new Date(md.modified),
      };
      if (await this.blogRepository.findOneBy(dict)) {
        continue;
      }
      const newMd =
        (await this.blogRepository.findOneBy({ title: title })) || new Blog();
      Object.assign(newMd, dict);
      await this.blogRepository.save(newMd);
      updateCnt++;
    }
    return updateCnt;
  }

  async sync_db() {
    let updateCnt = 0;
    const blogs = await this.blogRepository.find();
    const resCache: Record<string, AlistResponseData> = {};
    for (const blog of blogs) {
      const dir = blog.target.replace(/\/[^/]+\.md$/, '');
      let res = resCache[dir];
      if (!res) {
        res = await this.api_get_list(dir);
        resCache[dir] = res;
      }
      if (
        res &&
        res.content.find((item) => item.name === `${blog.title}.${blog.type}`)
      ) {
        continue;
      }
      await this.blogRepository.remove(blog);
      updateCnt++;
    }
    return updateCnt;
  }
}
