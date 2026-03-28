# S3 Bucket Uploader

This folder now contains only a standalone React + Express app for uploading files into AWS S3.

## What is inside

- `src/`: React frontend
- `server/`: Express backend that creates S3 presigned upload URLs
- `.env.example`: AWS and local configuration template

## Setup

1. Create your environment file:

```sh
copy .env.example .env
```

2. Fill in your AWS values in `.env`.

3. Install dependencies:

```sh
npm install
```

4. Start the frontend and backend:

```sh
npm run dev:full
```

5. Open [http://localhost:8080](http://localhost:8080)

## Required environment variables

- `AWS_REGION`
- `AWS_BUCKET_NAME`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Optional environment variables

- `VITE_API_BASE_URL`
- `AWS_S3_PREFIX`
- `ALLOWED_ORIGIN`
- `MAX_FILE_SIZE_BYTES`

## S3 bucket CORS example

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["http://localhost:8080"],
    "ExposeHeaders": ["ETag"]
  }
]
```
