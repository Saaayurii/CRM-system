import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRepository } from './repositories/user.repository';
import { CreateUserDto, UpdateUserDto, UserResponseDto, ChangePasswordDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async findAll(
    accountId: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    users: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userRepository.findAll(accountId, { skip, take: limit }),
      this.userRepository.count(accountId),
    ]);

    return {
      users: users.map(this.toResponseDto),
      total,
      page,
      limit,
    };
  }

  async findById(
    id: number,
    requestingUserAccountId: number,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if requesting user has access to this user (same account)
    if (user.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    return this.toResponseDto(user);
  }

  async findByRole(
    accountId: number,
    roleId: number,
  ): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findByAccountAndRole(
      accountId,
      roleId,
    );
    return users.map(this.toResponseDto);
  }

  async create(
    createUserDto: CreateUserDto,
    requestingUserAccountId: number,
  ): Promise<UserResponseDto> {
    const emailLower = createUserDto.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(emailLower);
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует в системе');
    }

    const deletedUser = await this.userRepository.findDeletedByEmail(emailLower);
    if (deletedUser) {
      throw new ConflictException(
        `Email ${emailLower} ранее использовался удалённым пользователем «${deletedUser.name}». ` +
        'Для создания нового пользователя сначала измените email удалённого пользователя или обратитесь к администратору БД.',
      );
    }

    let passwordDigest: string | undefined;
    if (createUserDto.password) {
      passwordDigest = await bcrypt.hash(createUserDto.password, 10);
    }

    const user = await this.userRepository.create({
      ...createUserDto,
      email: emailLower,
      accountId: requestingUserAccountId,
      passwordDigest,
    });
    return this.toResponseDto(user);
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    requestingUserAccountId: number,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if requesting user has access to this user
    if (user.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Access denied');
    }

    const { newPassword, ...rest } = updateUserDto;
    const updateData: Record<string, unknown> = { ...rest };
    if (newPassword) {
      updateData.passwordDigest = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await this.userRepository.update(id, updateData as any);
    return this.toResponseDto(updatedUser);
  }

  async remove(id: number, requestingUserAccountId: number): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (user.accountId !== requestingUserAccountId) {
      throw new ForbiddenException('Нет доступа');
    }

    // Obfuscate email so the address can be reused for a new account
    const obfuscatedEmail = `deleted_${id}_${Date.now()}@crm.deleted`;
    await this.userRepository.softDeleteWithEmail(id, obfuscatedEmail);
  }

  async changePassword(
    userId: number,
    accountId: number,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.accountId !== accountId) {
      throw new ForbiddenException('Access denied');
    }
    if (!user.passwordDigest) {
      throw new BadRequestException('User has no password set');
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordDigest);
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.update(userId, { passwordDigest: newHash } as any);

    return { message: 'Password changed successfully' };
  }

  private toResponseDto(user: any): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      position: user.position,
      avatarUrl: user.avatarUrl ?? undefined,
      accountId: user.accountId,
      roleId: user.roleId,
      role: user.role,
      passwordDigest: user.passwordDigest ?? undefined,
      isActive: user.isActive,
      availability: user.availability,
      createdAt: user.createdAt,
    };
  }
}
