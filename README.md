# Five999 Specialist Training Dashboard

A Render-hosted training dashboard for Five999 players to sign in with Discord, complete specialist subdivision briefings, and pass an end quiz.

## Features

- Specialist subdivision training modules
- Discord OAuth2 sign-in
- Command-only training add/edit tools
- Leadership-only training and division delete/admin tools
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
- `DISCORD_GUILD_ID`
- `DISCORD_BOT_TOKEN`
- `COMMAND_ROLE_IDS`
- `LEADERSHIP_ROLE_IDS`
- `SESSION_SECRET`
- `DATABASE_URL`

`SESSION_SECRET` can be any long random secret. `DATABASE_URL` should come from a Render PostgreSQL database if you want progress to persist reliably.

`COMMAND_ROLE_IDS` and `LEADERSHIP_ROLE_IDS` are comma-separated Discord role IDs. Leadership users automatically get Command permissions too. The bot token is used only to read the signed-in member's roles from your Discord server, so the bot must be in the Five999 Discord server.

For local testing without `DATABASE_URL`, progress is saved to `data/progress.json`.

## Discord OAuth2 Redirect

In the Discord Developer Portal, add this redirect URL:

```text
https://YOUR_RENDER_APP.onrender.com/auth/discord/callback
```

Use the same value for `DISCORD_REDIRECT_URI`.

## Role Locked Admin Areas

- Players can complete trainings and save progress.
- Command members can add and edit trainings.
- Leadership Team members can add, edit, and delete trainings/divisions.

To get role IDs in Discord, enable Developer Mode, right-click the role, and copy the role ID.

## Host on Render

1. Push these files to a GitHub repository.
2. In Render, choose **New +** then **Web Service**.
3. Connect the repository.
4. Add a Render PostgreSQL database.
5. Add the environment variables above.
6. Deploy.

Render can also detect the included `render.yaml`.
