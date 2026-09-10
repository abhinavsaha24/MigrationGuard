import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

function getS3Client(): S3Client {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'FATAL: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are required.',
    );
  }

  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
    endpoint: process.env.AWS_ENDPOINT || 'http://localhost:9000',
    forcePathStyle: true,
  });
}

const BUCKET_NAME = process.env.S3_BUCKET || 'migrationguard-storage';

export async function uploadFile(
  buffer: Buffer,
  mimeType: string,
  extension: string,
): Promise<string> {
  const key = `uploads/${uuidv4()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await getS3Client().send(command);
  return key;
}

export async function getFileStream(key: string): Promise<NodeJS.ReadableStream> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  const response = await getS3Client().send(command);
  if (!response.Body) {
    throw new Error('S3 response body is empty');
  }
  return response.Body as NodeJS.ReadableStream;
}
