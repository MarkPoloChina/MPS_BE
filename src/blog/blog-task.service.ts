import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { load } from 'js-yaml';
import { Blog } from './blog.entity';
import { Tag } from './tag.entity';
import { Repository } from 'typeorm';
interface NginxListdirJson {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  mtime: string;
}

@Injectable()
export class TaskService {
  NGINX_ROOT = 'https://fd.markpolo.cn/obsidian/Obsidian%20Vault';

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
    const res = await axios.get(`${this.NGINX_ROOT}/${dir}/`);
    if (res.status === 404) return null;
    else if (res.status !== 200)
      throw new Error('api_get_list failed with http code ' + res.status);
    const data: NginxListdirJson[] = res.data;
    return data;
  }

  async getMetaDataFromMd(mdPath: string) {
    const mdContent = await axios.get(`${this.NGINX_ROOT}/${mdPath}`);
    if (mdContent.status !== 200) {
      return null;
    }
    const res = this.parseMarkdownMeta(mdContent.data);
    if (!res.ok) {
      this.logger.warn(`Markdown ${mdPath} meta parse failed: ${res.reason}`);
      return null;
    } else {
      return {
        meta: res.meta,
        coverImage: res.coverImage,
      };
    }
  }

  parseMarkdownMeta(md: string) {
    const frontMatterMatch = md.match(/^---\n([\s\S]*?)\n---/);
    if (!frontMatterMatch) {
      return { ok: false, reason: '缺少合法的 YAML 元信息文件头' };
    }

    let meta: Record<string, any>;
    try {
      meta = load(frontMatterMatch[1]);
    } catch (e) {
      return { ok: false, reason: 'YAML 解析失败: ' + e.message };
    }

    if (!meta.title || !meta.update_time || !meta.status) {
      return {
        ok: false,
        reason: '缺少必需字段: title / update_time / status',
      };
    }
    if (meta.status !== 'DONE') {
      return { ok: false, reason: 'status 必须为 "DONE"' };
    }

    const hasRevNo = 'revision_no' in meta;
    const hasRevTime = 'revision_time' in meta;
    if (hasRevNo !== hasRevTime) {
      return {
        ok: false,
        reason: 'revision_no 和 revision_time 必须同时存在或同时不存在',
      };
    }

    for (const [key, val] of Object.entries(meta)) {
      if (key.endsWith('_time')) {
        const d = new Date(val);
        if (isNaN(d.getTime())) {
          return { ok: false, reason: `${key} 的值不是合法的日期字符串` };
        }
      }
    }

    const content = md.slice(frontMatterMatch[0].length);

    const imgMatch = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
    const firstImageUrl = imgMatch ? imgMatch[1] : null;

    return { ok: true, meta, coverImage: firstImageUrl };
  }

  async sync_dir(dir: string) {
    const content = await this.api_get_list(dir);
    if (
      dir &&
      dir.split('/').length === 1 &&
      !content.find((item) => item.name === '@allow.md')
    )
      return 0;
    let updateCnt = 0;
    const dirs = content.filter(
      (item) =>
        item.type === 'directory' &&
        !item.name.endsWith('.assets') &&
        !item.name.startsWith('@'),
    );
    const mds = content.filter(
      (item) =>
        item.type === 'file' &&
        item.name.endsWith('.md') &&
        !item.name.startsWith('@'),
    );
    for (const subDir of dirs) {
      const cnt = await this.sync_dir(
        `${[dir, subDir.name].filter(Boolean).join('/')}`,
      );
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
      let mdDb = await this.blogRepository.findOneBy({
        target: `${dir}/${md.name}`,
      });
      if (mdDb) {
        if (
          new Date(mdDb.fileDate).getTime() === new Date(md.mtime).getTime()
        ) {
          continue;
        }
      } else {
        mdDb = new Blog();
        mdDb.target = `${dir}/${md.name}`;
        mdDb.type = 'md';
        mdDb.tags = tagsToAdd;
      }
      const metaData = await this.getMetaDataFromMd(mdDb.target);
      if (!metaData) continue;
      mdDb.metaJson = JSON.stringify(metaData.meta);
      mdDb.imgTarget = metaData.coverImage;
      mdDb.title = metaData.meta.title;
      mdDb.uploadTime = new Date(metaData.meta.update_time);
      mdDb.fileDate = new Date(md.mtime);
      await this.blogRepository.save(mdDb);
      updateCnt++;
    }
    return updateCnt;
  }

  async sync_db() {
    let updateCnt = 0;
    const blogs = await this.blogRepository.find();
    const resCache: Record<string, NginxListdirJson[]> = {};
    for (const blog of blogs) {
      const dir = blog.target.replace(/\/[^/]+\.md$/, '');
      let res = resCache[dir];
      if (!res) {
        res = await this.api_get_list(dir);
        resCache[dir] = res;
      }
      if (
        res &&
        res.find((item) => item.name === blog.target.split('/').pop())
      ) {
        continue;
      }
      await this.blogRepository.remove(blog);
      updateCnt++;
    }
    return updateCnt;
  }
}
