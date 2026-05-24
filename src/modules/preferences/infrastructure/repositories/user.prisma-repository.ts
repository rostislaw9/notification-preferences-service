import { Injectable } from '@nestjs/common';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/ports/user.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(email: string, region?: string): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: { email, region },
    });
    return this.toEntity(user);
  }

  async findAll(): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => this.toEntity(user));
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user ? this.toEntity(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return user ? this.toEntity(user) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  private toEntity(user: {
    id: string;
    email: string;
    region: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserEntity {
    return {
      id: user.id,
      email: user.email,
      region: user.region ?? undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
