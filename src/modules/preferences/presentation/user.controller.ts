import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from '../application/dto/create-user.dto';
import { UserService } from '../application/services/user.service';
import { UserEntity } from '../domain/entities/user.entity';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user with default preferences' })
  @ApiBody({ type: CreateUserDto })
  @ApiOkResponse({ type: UserEntity, description: 'User created with default preferences' })
  async createUser(@Body() dto: CreateUserDto): Promise<UserEntity> {
    return this.userService.createUser(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiOkResponse({ type: [UserEntity], description: 'List of all users' })
  async getAllUsers(): Promise<UserEntity[]> {
    return this.userService.getAllUsers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOkResponse({ type: UserEntity, description: 'User found' })
  async getUser(@Param('id') id: string): Promise<UserEntity> {
    return this.userService.getUser(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user and all associated preferences' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOkResponse({ description: 'User deleted' })
  async deleteUser(@Param('id') id: string): Promise<void> {
    return this.userService.deleteUser(id);
  }
}
