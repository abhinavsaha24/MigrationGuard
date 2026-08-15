import { s3, BUCKET_NAME } from './config/s3.js';
import { CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

async function main() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`Bucket ${BUCKET_NAME} already exists.`);
  } catch (err: any) {
    if (err.$metadata?.httpStatusCode === 404) {
      console.log(`Creating bucket ${BUCKET_NAME}...`);
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
      console.log(`Bucket created.`);
    } else {
      console.error(err);
      process.exit(1);
    }
  }
}

main();
