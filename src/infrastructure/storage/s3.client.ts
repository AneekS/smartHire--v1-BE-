import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { env } from '../../config/env';
import { MAX_RESUME_FILE_SIZE_BYTES } from '../../config/constants';

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function uploadResume(
  file: Buffer,
  candidateId: string,
  fileName: string,
  contentType: string
): Promise<string> {
  const key = `resumes/${candidateId}/${Date.now()}-${fileName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    })
  );

  return key;
}

export async function getResumeViewUrl(key: string): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
    { expiresIn: 3600 }
  );
}

export async function downloadFromS3(key: string): Promise<string> {
  const tempPath = join(tmpdir(), `smarthire-resume-${randomUUID()}`);

  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  });
  const response = await s3.send(command);
  const body = response.Body as Readable;

  if (!body) {
    throw new Error('Empty S3 response body');
  }

  const writeStream = createWriteStream(tempPath);
  await pipeline(body, writeStream);

  return tempPath;
}

export async function deleteLocalFile(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // File already deleted or never created
  }
}

