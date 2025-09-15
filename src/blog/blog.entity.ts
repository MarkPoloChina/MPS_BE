import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
  ManyToMany,
} from 'typeorm';
import { Tag } from './tag.entity';

@Entity()
export class Blog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'varchar' })
  metaJson: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'datetime' })
  uploadTime: Date;

  @Column({ type: 'varchar', unique: true })
  target: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  imgTarget: string;

  @Column({ type: 'datetime', unique: false })
  fileDate: Date;

  @ManyToMany(() => Tag, (tag) => tag.blogs, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  tags: Tag[];

  @UpdateDateColumn()
  updateDate: Date;

  @CreateDateColumn()
  createDate: Date;
}
