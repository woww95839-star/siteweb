import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@sokplus.dz' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({ example: 'Admin@123456' })
  @IsString()
  @MinLength(8, { message: 'Mot de passe trop court (8 min)' })
  @MaxLength(100)
  password: string;
}
