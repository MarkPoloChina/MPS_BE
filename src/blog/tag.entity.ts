import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Blog } from './blog.entity';

@Entity()
export class Tag {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'int', nullable: false })
  level: number;

  @Column({ type: 'varchar', nullable: false, unique: true })
  name: string;

  @ManyToMany(() => Blog, (blog) => blog.tags, {
    onDelete: 'CASCADE',
  })
  @JoinTable()
  blogs: Blog[];

  @OneToMany(() => Tag, (child) => child.parent)
  children: Tag[];

  @ManyToOne(() => Tag, (parent) => parent.children, { nullable: true })
  @JoinColumn()
  parent: Tag;
}
