import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsOptional, validateSync, Min, Max } from 'class-validator';

class EnvironmentVariables {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  REDIS_HOST: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRATION: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRATION: string;

  @IsNumber()
  @IsOptional()
  BCRYPT_SALT_ROUNDS: number;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_TTL: number;

  @IsNumber()
  @IsOptional()
  RATE_LIMIT_MAX: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
