import { UserEntity } from '../entities/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  create(email: string, region?: string): Promise<UserEntity>;
  findAll(): Promise<UserEntity[]>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  delete(id: string): Promise<void>;
}
