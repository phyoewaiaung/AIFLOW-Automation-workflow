import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      create: jest.fn(),
    },
    membership: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = { email: 'test@example.com', password: 'password123', name: 'Test User' };

    it('should register a new user with auto org creation', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'user-1',
          email: dto.email,
          name: dto.name,
          password: 'hashed',
          memberships: [{ id: 'mem-1', organization: { id: 'org-1', name: 'Test Org' }, role: 'OWNER' }],
        });
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        name: dto.name,
        password: 'hashed',
      });
      mockPrisma.organization.create.mockResolvedValue({ id: 'org-1', name: 'Test Org', slug: 'org-user-1' });
      mockPrisma.membership.create.mockResolvedValue({ id: 'mem-1' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.register(dto);

      expect(result).toHaveProperty('token', 'test-token');
      expect(result.user.email).toBe(dto.email);
      expect(mockPrisma.organization.create).toHaveBeenCalled();
      expect(mockPrisma.membership.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ role: 'OWNER' }) })
      );
    });

    it('should throw ConflictException for duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto = { email: 'test@example.com', password: 'password123' };

    it('should login with valid credentials', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'user-1',
          email: dto.email,
          password: 'hashed',
          name: 'Test User',
        })
        .mockResolvedValueOnce({
          id: 'user-1',
          email: dto.email,
          name: 'Test User',
          password: 'hashed',
          memberships: [],
        });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(result).toHaveProperty('token', 'test-token');
      expect(result.user.email).toBe(dto.email);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        password: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user without password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'secret',
        name: 'Test',
        memberships: [],
      });

      const result = await service.validateUser('user-1');

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException for missing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('bad-id')).rejects.toThrow(UnauthorizedException);
    });
  });
});
