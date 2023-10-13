import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class IllustToday {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'varchar', unique: true })
  target: string;

  @Column({ type: 'date', unique: true })
  date: string;

  @Column({ type: 'varchar', nullable: true })
  tags: string;

  @Column({ type: 'varchar', nullable: true })
  char: string;

  @UpdateDateColumn()
  updateDate: Date;

  @CreateDateColumn()
  createDate: Date;
}
