import { S3Client } from '@aws-sdk/client-s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

function getS3Client(): S3Client {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const endpoint = process.env.AWS_ENDPOINT;

  const config: any = {
    region: process.env.AWS_REGION || 'us-east-1',
    forcePathStyle: true,
  };

  if (accessKeyId && secretAccessKey) {
    config.credentials = { accessKeyId, secretAccessKey };
  } else {
    console.warn(
      'AWS credentials not explicitly provided. Falling back to IAM/Environment credentials.',
    );
  }

  if (endpoint) {
    config.endpoint = endpoint;
  }

  return new S3Client(config);
}

export const BUCKET_NAME = process.env.S3_BUCKET || 'migrationguard-storage';

export { PutObjectCommand, GetObjectCommand };
