import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private s3_client: S3Client;

  constructor() {
    this.s3_client = new S3Client({
      region: process.env.AWS_S3_REGION,
      credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async uploadFileToPublicBucket({ file, path }: {
    file: Express.Multer.File;
    path: string;
  }) {
    const bucket_name = process.env.AWS_S3_PUBLIC_BUCKET;
    const key = `${path}/${Date.now().toString()}-${file.originalname}`;
    await this.s3_client.send(
      new PutObjectCommand({
        Bucket: bucket_name,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
        ContentLength: file.size, // calculate length of buffer
      }),
    );

    return `https://${bucket_name}.s3.amazonaws.com/${key}`;
  }
}
