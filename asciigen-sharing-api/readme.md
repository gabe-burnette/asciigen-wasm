# Bun Image Sharing Server

A fast and efficient image sharing server built with Bun and SQLite.

When using test.js, you have to disable rate limiting on index.js to use.

## Features

- Two main routes: `/new` for uploading and `/existing` for retrieving
- You will need a cloudflare origin server cert, key, and ca to use, for https.
- SQLite database with Write-Ahead Logging (WAL) for improved performance
- Rate limiting to prevent abuse
- Turnstile integration for spam prevention
- Duplicate image detection
- Configurable sharing options

## Database Structure

### Database: `asciigen_db`

#### Tables

1. **Rate Limit**
   - `IP`: text (primary key)
   - `expiry`: number

2. **Image Hashes**
   - `Hash`: text (primary key)
   - `Added_by_ip`: text
   - `Added_ts`: text

4. **Share Links**
   - `link`: text (primary key)
   - `Hash`: text
   - `options`: text
   - `viewed`: number

> Note: All links are 10 characters long

## API Endpoints

### POST `/new`

Uploads an image with options and returns a share link.

#### Request Body
- `image`: blob
- `options`: JSON
- `turnstile_response`: text

#### Workflow
1. Check rate limit (15s) for user IP
2. Validate Turnstile response
3. Validate options
4. Ensure image size < 0.5MB
5. Hash image and check for duplicates
6. Store new image or retrieve existing image ID
7. Generate and return share link

### POST `/existing`

Retrieves an image and its options using a share link.

#### Request Body
- `share_key`: text
- `turnstile_response`: text

#### Workflow
1. Check rate limit (15s) for user IP
2. Validate Turnstile response
3. Validate share key
4. Retrieve image and options
5. Return image and options

## Background Tasks

A background task runs every 15 seconds to clean up expired rate limit entries from the database.
