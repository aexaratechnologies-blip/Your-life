# Your-life — Free Faceless YouTube Automation

## Pipeline

GitHub Actions runs the pipeline daily. It discovers technology/AI trends, selects up to four topics, creates an original script, renders a faceless video with FFmpeg + local espeak-ng, creates a thumbnail, and uploads through the official YouTube Data API.

## Required GitHub Actions secrets

Add these repository secrets in GitHub Settings → Secrets and variables → Actions:

- `YOUTUBE_API_KEY` — Google/YouTube Data API key for trend discovery.
- `YOUTUBE_CLIENT_ID` — OAuth client ID for the channel.
- `YOUTUBE_CLIENT_SECRET` — OAuth client secret.
- `YOUTUBE_REFRESH_TOKEN` — OAuth refresh token authorized for `youtube.upload`.
- `GEMINI_API_KEY` — optional free-tier Gemini API key. If omitted, the pipeline uses its safe deterministic fallback script template; for true AI-written scripts, configure this secret without enabling billing.

## YouTube OAuth

The refresh token must belong to the YouTube channel that should receive the uploads and must include the `https://www.googleapis.com/auth/youtube.upload` scope.

## Publishing

The default configuration uses `private` because new/unverified API projects can have upload restrictions. After the channel/API project is properly configured and verified, change `visibility` in `youtube_automation/config.json` to `public` or `unlisted` as desired.

## Important free-tier constraint

No paid automation platform is used. Rendering runs directly on the GitHub Actions runner and uses open-source/local tools. Third-party API free quotas still apply; this repository does not bypass provider quotas or YouTube policies.

## Manual test

Use GitHub Actions → Daily YouTube Automation → Run workflow. Do not switch the visibility to public until the first run has been verified.
