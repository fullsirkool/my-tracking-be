import { Controller, Post, UploadedFile } from '@nestjs/common';
import { FileService } from './file.service';
import { ApiTags } from '@nestjs/swagger';
import { ApiFile } from 'src/decorators/api.file.decorator';

@Controller('file')
@ApiTags('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @ApiFile()
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log('file', file)
    const destination = `images`
    return await this.fileService.uploadFile(file, destination);
  }
}
