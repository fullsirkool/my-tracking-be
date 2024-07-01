import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileService } from './file.service';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SingleUploadDto } from './file.dto';

@Controller('file')
@ApiTags('file')
export class FileController {
  constructor(private readonly fileService: FileService) {
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({ type: SingleUploadDto })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() fileUploadDto: SingleUploadDto,
  ) {
    return await this.fileService.uploadFile(file, fileUploadDto);
  }
}
