import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser, LoginResponse } from '@pharmapro/shared';
import type { Request } from 'express';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RefreshTokenDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Sign in and receive access + refresh tokens' })
  login(@Body() dto: LoginDto, @Req() request: Request): Promise<LoginResponse> {
    return this.authService.login(dto, request);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  refresh(@Body() dto: RefreshTokenDto): Promise<LoginResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated user' })
  me(@CurrentUser() user: RequestUser): Promise<AuthUser> {
    return this.authService.me(user);
  }

  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Invalidate the current session' })
  logout(@CurrentUser() user: RequestUser, @Req() request: Request): { success: boolean } {
    return this.authService.logout(user.sub, request);
  }

  @ApiBearerAuth()
  @Post('change-password')
  @ApiOperation({ summary: 'Change the current user password' })
  changePassword(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto, @Req() request: Request) {
    return this.authService.changePassword(user, dto, request);
  }
}