import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserEntity } from '../../domain/entities/user.entity';
import {
  DEFAULT_PREFERENCE_REPOSITORY,
  DefaultPreferenceRepository,
} from '../../domain/ports/default-preference.repository';
import {
  USER_PREFERENCE_REPOSITORY,
  UserPreferenceRepository,
} from '../../domain/ports/user-preference.repository';
import { USER_REPOSITORY, UserRepository } from '../../domain/ports/user.repository';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Inject(DEFAULT_PREFERENCE_REPOSITORY)
    private readonly defaultPreferenceRepo: DefaultPreferenceRepository,
    @Inject(USER_PREFERENCE_REPOSITORY)
    private readonly userPreferenceRepo: UserPreferenceRepository,
  ) {}

  async createUser(dto: CreateUserDto): Promise<UserEntity> {
    // Check if user with this email already exists
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    // Create user
    const user = await this.userRepo.create(dto.email, dto.region);
    this.logger.log({ userId: user.id, email: user.email }, 'User created');

    // Copy default preferences to user preferences
    const defaults = await this.defaultPreferenceRepo.findAll();
    if (defaults.length > 0) {
      await this.userPreferenceRepo.upsertMany(
        defaults.map((def) => ({
          userId: user.id,
          notificationType: def.notificationType,
          channel: def.channel,
          enabled: def.enabled,
        })),
      );
      this.logger.log(
        { userId: user.id, count: defaults.length },
        'Default preferences copied to new user',
      );
    }

    return user;
  }

  async getAllUsers(): Promise<UserEntity[]> {
    return this.userRepo.findAll();
  }

  async getUser(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    await this.userRepo.delete(id);
    this.logger.log({ userId: id }, 'User deleted');
  }
}
