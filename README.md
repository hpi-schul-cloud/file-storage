# File Storage Service

This project provides a file storage service with integrated antivirus scanning, authorization, and preview generation. It is designed for use in secure environments and supports integration with external services such as S3-compatible storage, antivirus servers, Collabora and authorization APIs.

## Features

- **File Upload & Download**: Securely upload and download files.
- **Antivirus Integration**: Files with Preview are scanned for viruses before being stored.
- **Authorization**: Access is controlled via an external authorization API.
- **Preview Generation**: Supports generating previews for supported file types. It needs ImageMagick installed on the system.
- **Logging**: Detailed logging for debugging and auditing.
- **RabbitMQ Integration**: For asynchronous processing and notifications.
- **MongoDB Support**: Stores file metadata.
- **Collabora Support**: Integrates online office document collaboration.

## Remote preview-image imports

Link-preview callers must send `previewOnly: true` in the body of
`POST /file/upload-from-url/:storageLocation/:storageLocationId/:parentType/:parentId`.
This mode checks the downloaded bytes before creating a file record or storing the
original. Only detected PNG, JPEG, GIF and WebP content is accepted, and the HTTP
`Content-Type` (case-insensitive, ignoring parameters) must match the detected type.
Missing or mismatched content types, SVG/XML, unsupported or unknown content, and
detection failures return HTTP 422 with `MIME_TYPE_MISMATCH`.

Omitting the flag preserves the existing general media-import behavior. Ordinary
multipart uploads are unchanged.

The link-preview upload is nuxt-client `LinkContentElement` (`createPreviewImage`),
which sends `previewOnly: true` (nuxt-client #4386). `LinkContentElementDisplay`
embeds that stored preview only as an `<img>` (`data-testid="link-preview-image"`).
It does not use `<object>`, `<embed>`, `<iframe>`, or inline SVG, and the card
navigates to the page URL rather than the image file. schulcloud-server OpenGraph
(`MetaTagExternalUrlService`) returns `originalImageUrl` and does not call
`uploadFromUrl`, so there is no second store path to flag. `preview-generator`
only resizes an object that is already stored. Other `uploadFromUrl` callers
(external-tool logos, the legacy CKEditor file copy) are general media imports
and leave the flag off. A link preview is checked only when its caller sends the
flag, so a new importer has to opt in the same way.

Preview responses (`GET /file/preview/...`, including 200, 206, and conditional
304) and stored-file downloads (`GET /file/download/...`, including 200 and 206)
include `X-Content-Type-Options: nosniff` and
`Content-Security-Policy: default-src 'none'; sandbox`. Inline PDF downloads
keep `nosniff` and omit the sandbox policy so the browser PDF viewer can render
them. That covers a stored link image, including an older `image/svg+xml`
record opened directly.

### Stored SVG/XML previews

A production process removes stored files whose bytes are SVG or XML but that were
saved as raster previews. `FILES_STORAGE_CLEANUP_STORED_SVG_XML_PREVIEWS` defaults
to `true`. The first production start scans once, soft-deletes each match, moves
the object to trash, and deletes generated previews. Completion is stored in
`filestoragemaintenance` (`_id`: `svsdev-470-stored-svg-xml-preview-cleanup`), so
later restarts do not scan again. Set the variable to `false` to skip the run.
Delete that document to run it again.

A file is removed only when its leading bytes are SVG or XML (a raster signature
is left alone, including a PNG or JPEG that also contains SVG later) and either:

- the declared type is `image/png`, `image/jpeg`, `image/jpg`, `image/pjpeg`,
  `image/x-png`, `image/gif`, or `image/webp` (case and parameters ignored), or
- the declared type is SVG, XML, HTML, or generic binary and the name ends in
  `.png`, `.jpg`, `.jpeg`, `.gif`, or `.webp`.

That covers a previously stored `poc.png` whose body is `<svg>`.

Honest `image/svg+xml` or XML originals, such as `diagram.svg`, are not deleted.
File records do not record whether a file was a link preview or a course document,
and ordinary uploads can still store SVG. SVSDEV-470 accepts a new link that cannot
store SVG. Board references live in other services; once a disguised file is
removed, that preview no longer resolves.

## Environment Variables

Configuration is managed via the `.env` file. Key variables include:

| Variable                                  | Description                             |
| ----------------------------------------- | --------------------------------------- |
| ENABLE_FILE_SECURITY_CHECK                | Enable antivirus scanning               |
| ANTIVIRUS_SERVICE_HOSTNAME                | Antivirus server hostname               |
| ANTIVIRUS_SERVICE_PORT                    | Antivirus server port                   |
| FILE_STORAGE_SERVICE_URL                  | Base URL for the file storage service   |
| FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS     | Use streaming for antivirus checks      |
| FILES_STORAGE_CLEANUP_STORED_SVG_XML_PREVIEWS | Clean disguised SVG/XML previews once on production start |
| AUTHORIZATION_API_URL                     | URL of the authorization API            |
| LOGGER_LOG_LEVEL                          | Logging level (e.g., debug, info, warn) |
| RABBITMQ_URI                              | RabbitMQ connection URI                 |
| DB_URL                                    | MongoDB connection URI                  |
| DB_DEBUG                                  | Enable MongoDB debug logging            |
| PREVIEW_PRODUCER_INCOMING_REQUEST_TIMEOUT | Timeout for preview generation requests |
| CORE_INCOMING_REQUEST_TIMEOUT_MS          | Core service request timeout (ms)       |
| INCOMING_REQUEST_TIMEOUT_COPY_API_MS      | Timeout for copy API requests (ms)      |
| FEATURE_COLUMN_BOARD_COLLABORA_ENABLED    | Enable Collabora feature                |
| COLLABORA_ONLINE_URL                      | Base URL of the Collabora server        |
| WOPI_URL                                  | Base URL of the WOPI endpoints          |
| WOPI_POST_MESSAGE_ORIGIN                  | Origin of POST messages to Collabora    |


## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm
- MongoDB
- RabbitMQ
- S3-compatible storage (e.g., AWS S3, MinIO)
- Antivirus server (e.g., ClamAV)
- Collabora Online Development Edition

### Installation

1. **Clone the repository:**

   ```sh
   git clone <repository-url>
   cd file-storage
   ```

2. **Install dependencies:**

   ```sh
   npm ci --ignore-scripts
   ```

3. **Configure environment:**

   - Copy `.env.default` to `.env` and adjust values as needed.

4. **Start the service:**
   ```sh
   npm run start:files-storage:dev
   ```

### Running Tests

```sh
npm run test
```

### Collabora installation

For more information about local Collabora setup, please check
https://documentation.dbildungscloud.dev/docs/services/collabora/Local%20setup


## Project Structure

- `src/` - Main source code
  - `testing/` - Testing utilities and mocks
  - `shared/` - Shared utilities and types
  - `modules/` - Domain modules (file storage, etc.)
  - `infra/` - Infrastructure (S3 client, authorization, configuration, antivirus client)
- `.env` - Environment configuration
