import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import fs from 'fs'
import path from 'path'
import { envConfig } from '~/constants/config'

let s3Client: S3Client | null = null

const getS3Client = () => {
  if (!envConfig.awsAccessKeyId || !envConfig.awsSecretAccessKey) {
    return null
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: envConfig.awsRegion,
      credentials: {
        accessKeyId: envConfig.awsAccessKeyId,
        secretAccessKey: envConfig.awsSecretAccessKey
      }
    })
  }
  return s3Client
}

export const uploadFileToS3 = async ({
  filename,
  filepath,
  contentType
}: {
  filename: string
  filepath: string
  contentType: string
}) => {
  const client = getS3Client()
  if (!client) {
    throw new Error('S3 is not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env')
  }

  const parallelUploads3 = new Upload({
    client,
    params: {
      Bucket: envConfig.s3BucketName,
      Key: filename,
      Body: fs.createReadStream(filepath),
      ContentType: contentType
    },
    tags: [],
    queueSize: 4,
    partSize: 1024 * 1024 * 5,
    leavePartsOnError: false
  })

  return parallelUploads3.done()
}

export const sendFileFromS3 = async (res: any, filepath: string) => {
  const client = getS3Client()
  if (!client) {
    throw new Error('S3 is not configured.')
  }
  const command = new GetObjectCommand({
    Bucket: envConfig.s3BucketName,
    Key: filepath
  })
  const data = await client.send(command)
  ;(data.Body as any).pipe(res)
}
