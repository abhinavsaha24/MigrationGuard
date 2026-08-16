import { s3, BUCKET_NAME } from '../config/s3.js';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

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

  await s3.send(command);
  return key;
}

export async function getFileStream(key: string): Promise<NodeJS.ReadableStream> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  const response = await s3.send(command);
  if (!response.Body) {
    throw new Error('S3 response body is empty');
  }
  return response.Body as NodeJS.ReadableStream;
}
