import { S3Client } from '@aws-sdk/client-s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin_password',
  },
  endpoint: process.env.AWS_ENDPOINT || 'http://localhost:9000',
  forcePathStyle: true, // Needed for MinIO
});

export const BUCKET_NAME = process.env.S3_BUCKET || 'migrationguard-storage';
