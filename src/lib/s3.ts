import AWS from "aws-sdk";

export async function uploadToS3(file: File) {
  try {
    AWS.config.update({
      accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY,
      region: "us-east-2", // ✅ IMPORTANT
    });

    const s3 = new AWS.S3();

    const file_key =
      "uploads/" + Date.now().toString() + file.name.replace(" ", "-");

    const params = {
  Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
  Key: file_key,
  Body: file,
  ContentType: file.type, // good practice
};

    const upload = s3
      .putObject(params)
      .on("httpUploadProgress", (evt) => {
        console.log(
          "uploading to s3...",
          parseInt(((evt.loaded * 100) / (evt.total || 1)).toString()) + "%"
        );
      })
      .promise();

    await upload.then(() => {
      console.log("Successfully Uploaded to S3 !", file_key);
    });

    return Promise.resolve({
      file_key: file_key,
      file_name: file.name,
    });
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function getS3Url(file_key: string) {
  const bucket = process.env.NEXT_PUBLIC_S3_BUCKET_NAME;
  return `https://${bucket}.s3.us-east-2.amazonaws.com/${file_key}`;
}