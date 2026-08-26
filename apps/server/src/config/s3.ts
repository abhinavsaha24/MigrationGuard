import { S3Client } from '@aws-sdk/client-s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

function getS3Client(): S3Client {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('FATAL: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are required.');
  }

  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
    endpoint: process.env.AWS_ENDPOINT || 'http://localhost:9000',
    forcePathStyle: true,
  });
}

export const BUCKET_NAME = process.env.S3_BUCKET || 'migrationguard-storage';

export { PutObjectCommand, GetObjectCommand };


