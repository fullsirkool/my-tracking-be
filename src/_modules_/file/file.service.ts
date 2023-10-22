import { BadRequestException, Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class FileService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async uploadFile(
    file: Express.Multer.File,
    destination: string,
  ): Promise<string> {
    const storage = this.firebaseService.getFirebaseApp().storage();
    const bucket = storage.bucket();

    try {
      const blob = await bucket.file(`${destination}/${file.originalname}`);

      const blobWriter = await blob.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
        public: true,
      });

      await blobWriter.end(file.buffer);

      const url = await blob.publicUrl();
      return url;
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Failed to upload the file');
    }
  }
}
