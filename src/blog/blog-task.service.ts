import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Blog } from './blog.entity';
import { Tag } from './tag.entity';
import { Repository } from 'typeorm';
interface ZFileListdirResponse {
  code: string;
  msg: string;
  data: {
    files: ZFileFile[];
    passwordPattern: string | null;
  };
  dataCount: number | null;
  traceId: string;
}

interface ZFileFile {
  name: string;
  time: string;
  size: number | null;
  type: 'FOLDER' | 'FILE';
  path: string;
  url: string | null;
}

@Injectable()
export class TaskService {
  ZFILE_API_URL = 'https://zfile.markpolo.cn/api/storage/files';
  ZFILE_STORAGE_KEY = 'Public';
  ZFILE_ROOT = '/MPS/Notes';

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
    const res = await axios.post(this.ZFILE_API_URL, {
      path: `${this.ZFILE_ROOT}${dir}`,
      init: true,
      storageKey: this.ZFILE_STORAGE_KEY,
      password: '',
      orderBy: 'name',
      orderDirection: 'asc',
    });
    const data: ZFileListdirResponse = res.data;
    if (data.code === '0') return data.data.files;
    else if (data.code === '41026') return null;
    else throw new Error('api_get_list failed with code ' + data.code);
  }

  async sync_dir(dir: string) {
    let updateCnt = 0;
    const content = await this.api_get_list(dir);
    const dirs = content.filter((item) => item.type === 'FOLDER');
    const mds = content.filter(
      (item) => item.type === 'FILE' && item.name.endsWith('.md'),
    );
    const isImage = (name: string) =>
      ['.jpg', '.jpeg', '.png', '.gif'].some((ext) => name.endsWith(ext));
    const pics = content.filter(
      (item) => item.type === 'FILE' && isImage(item.name),
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
        fileDate: new Date(md.time),
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
    const resCache: Record<string, ZFileFile[]> = {};
    for (const blog of blogs) {
      const dir = blog.target.replace(/\/[^/]+\.md$/, '');
      let res = resCache[dir];
      if (!res) {
        res = await this.api_get_list(dir);
        resCache[dir] = res;
      }
      if (
        res &&
        res.find((item) => item.name === `${blog.title}.${blog.type}`)
      ) {
        continue;
      }
      await this.blogRepository.remove(blog);
      updateCnt++;
    }
    return updateCnt;
  }
}
