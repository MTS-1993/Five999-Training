# Five999 Specialist Training Dashboard

A Render-hosted training dashboard for Five999 players to sign in with Discord, complete specialist subdivision briefings, and pass an end quiz.

## Features

- Specialist subdivision training modules
- Empty by default, with sidebar sections for:
  - United Kingdom Police Service
  - United Kingdom Ambulance Service
  - United Kingdom Fire and Rescue Service
  - UK Search & Rescue
  - UK Highways
  - National Transport Police
- Discord OAuth2 sign-in
- Command-only training add/edit tools
- Leadership-only training and division delete/admin tools
- Separate role-locked Create/Edit/Delete area, no JSON editing required
- Role-locked admin analytics for Command and Leadership teams
- Optional image URLs and resource URLs for trainings and modules
- Uploaded images for trainings and modules, stored with the training record
- Quiz requirement can be toggled on or off per training
- Quiz questions can use two or more answers, so yes/no questions are supported
- Quiz locked until all modules are marked read
- 80% pass requirement
- Saved progress and completed trainings by Discord account
- Player training profile with progress badges for each course
- Completion message for players to screenshot
- Downloadable completion certificate with player name, course, date, and Five999 logo
- Downloadable PDF certificate as well as PNG certificate
- Optional Discord DM notification when a player completes a training
- Discord support ticket button for role requests through FMS
- Mobile-friendly Command training management layout
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
- `DISCORD_DM_NOTIFICATIONS`
- `SESSION_SECRET`
- `DATABASE_URL`

`SESSION_SECRET` can be any long random secret. `DATABASE_URL` should come from a Render PostgreSQL database if you want progress to persist reliably.

`COMMAND_ROLE_IDS` and `LEADERSHIP_ROLE_IDS` are comma-separated Discord role IDs. Leadership users automatically get Command permissions too. The bot token is used only to read the signed-in member's roles from your Discord server, so the bot must be in the Five999 Discord server.

For local testing without `DATABASE_URL`, progress is saved to `data/progress.json`.

Set `DISCORD_DM_NOTIFICATIONS=true` if you want the bot to DM players when they complete a training. This requires `DISCORD_BOT_TOKEN` to be set, and some players may need to allow DMs from server members in Discord.

## Discord OAuth2 Redirect

In the Discord Developer Portal, add this redirect URL:

```text
https://YOUR_RENDER_APP.onrender.com/auth/discord/callback
```

Use the same value for `DISCORD_REDIRECT_URI`.

## Role Locked Admin Areas

- Players can complete trainings and save progress.
- Command members can add and edit trainings from the dashboard.
- Leadership Team members can add, edit, and delete trainings/divisions from the dashboard.
- Command and Leadership members can view training statistics, course completion rates, and per-user pass data.
- Training creators can add modules, quiz questions, image URLs, and resource URLs using buttons and fields.
- The Add Module Below button appears on each module card for easier editing.
The app now starts with no example trainings. Importing `database/full-import.sql` also clears the training list to empty.

To get role IDs in Discord, enable Developer Mode, right-click the role, and copy the role ID.

## Host on Render

1. Push these files to a GitHub repository.
2. In Render, choose **New +** then **Web Service**.
3. Connect the repository.
4. Add a Render PostgreSQL database.
5. Add the environment variables above.
6. Deploy.

Render can also detect the included `render.yaml`.
