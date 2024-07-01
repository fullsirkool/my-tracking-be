import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum FileType {
  CHALLENGE_BACKGROUND = 'USER_AVATAR',
  TRACKLOG_EVIDENT = 'TRACKLOG_EVIDENT',
}

export class BaseFileUploadDto {
  @ApiProperty({ enum: FileType, required: true })
  @IsEnum(FileType)
  fileType: FileType;
}

export class SingleUploadDto extends BaseFileUploadDto {
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  file: Express.Multer.File;
}