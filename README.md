# Five999 Specialist Training Dashboard

A Render-hosted training dashboard for Five999 players to sign in with Discord, complete specialist subdivision briefings, and pass an end quiz.

## Features

- Specialist subdivision training modules
- Discord OAuth2 sign-in
- Quiz locked until all modules are marked read
- 80% pass requirement
- Saved progress and completed trainings by Discord account
- Completion message for players to screenshot
- Discord support ticket button for role requests through FMS
- Render web-service configuration included

## Render Environment Variables

Set these in Render:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `DISCORD_TICKET_URL`
- `SESSION_SECRET`
- `DATABASE_URL`

`SESSION_SECRET` can be any long random secret. `DATABASE_URL` should come from a Render PostgreSQL database if you want progress to persist reliably.

For local testing without `DATABASE_URL`, progress is saved to `data/progress.json`.

## Discord OAuth2 Redirect

In the Discord Developer Portal, add this redirect URL:

```text
https://YOUR_RENDER_APP.onrender.com/auth/discord/callback
```

Use the same value for `DISCORD_REDIRECT_URI`.

## Host on Render

1. Push these files to a GitHub repository.
2. In Render, choose **New +** then **Web Service**.
3. Connect the repository.
4. Add a Render PostgreSQL database.
5. Add the environment variables above.
6. Deploy.

Render can also detect the included `render.yaml`.
