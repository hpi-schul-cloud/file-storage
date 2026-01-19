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

## Environment Variables

Configuration is managed via the `.env` file. Key variables include:

| Variable                                  | Description                             |
| ----------------------------------------- | --------------------------------------- |
| ENABLE_FILE_SECURITY_CHECK                | Enable antivirus scanning               |
| ANTIVIRUS_SERVICE_HOSTNAME                | Antivirus server hostname               |
| ANTIVIRUS_SERVICE_PORT                    | Antivirus server port                   |
| FILE_STORAGE_SERVICE_URL                  | Base URL for the file storage service   |
| FILES_STORAGE_USE_STREAM_TO_ANTIVIRUS     | Use streaming for antivirus checks      |
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
   npm ci
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
