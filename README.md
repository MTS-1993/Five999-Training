# Five999 Specialist Training Dashboard

A Render-hosted training dashboard for Five999 players to sign in with Discord, complete specialist subdivision briefings, and pass an end quiz.

## Features

- Specialist subdivision training modules
- Refreshed dashboard layout with clearer service, Command, and analytics areas
- Intro landing page explaining how players navigate trainings and save completion proof
- Start Training button before modules and quizzes unlock
- Empty by default, with sidebar sections for:
  - United Kingdom Police Service
  - United Kingdom Ambulance Service
  - United Kingdom Fire and Rescue Service
  - UK Search & Rescue
  - UK Highways
  - National Transport Police
  - Emergency Operations Centre
- Discord OAuth2 sign-in
- Command-only training add/edit tools
- Leadership-only training and division delete/admin tools
- Separate role-locked Create/Edit/Delete area, no JSON editing required
- Draft/published toggle so Command can prepare trainings before players see them
- Private-link trainings that stay out of the public catalogue and only load from a URL containing their access code

## Creating a private Community Welfare Team training

1. Open the Training Dashboard and choose **Create New Training**.
2. Select **Community Welfare Team** as the service section.
3. Add the training modules and quiz.
4. Leave **Published to players** enabled and enable **Private link only**.
5. Save the training, then use **Copy Private Link**.

Only people with that complete URL can load the training. It is omitted from the public training list and search results. Saving the training again keeps the same private URL unless its access code is manually changed.
- Role-locked admin analytics for Command and Leadership teams
- Optional service-specific Command permissions by Discord role
- Audit log for training edits, imports, exports, and practical assessments
- Bulk training import/export plus analytics CSV export
- Clickable player profiles in analytics with full training history
- Training feedback table in Command analytics
- Optional image URLs and resource URLs for trainings and modules
- Uploaded images for trainings and modules, stored with the training record
- Quiz requirement can be toggled on or off per training
- Optional in-game practical stage after theory, with Command practical pass/fail approval
- Optional theory-passed FMS group award for awaiting-practical roles
- Quiz questions can use two or more answers, so yes/no questions are supported
- Quiz locked until all modules are marked read
- 80% pass requirement
- Saved progress and completed trainings by Discord account
- Separate player training profile with progress badges for each course
- Player certificates library with PNG/PDF downloads for completed trainings
- Sidebar search for finding trainings quickly
- Home screen dark/light mode toggle
- Completion message confirming the FMS training group update
- Downloadable completion certificate with player name, course, date, and Five999 logo
- Downloadable PDF certificate as well as PNG certificate
- Certificate preview after completing a course
- Cleaner certificate completion summary with player name, score, date, and FMS status
- Player feedback form after completing a course
- Optional Discord DM notification when a player completes a training
- Optional Albo FMS training group award when a player passes a course
- Existing FMS training groups are imported into the player's dashboard as completed trainings
- Sidebar copyright: Five RP Group 2026
- Mobile-friendly Command training management layout
- Render web-service configuration included

## Render Environment Variables

Set these in Render:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`
- `DISCORD_GUILD_ID`
- `DISCORD_BOT_TOKEN`
- `COMMAND_ROLE_IDS`
- `LEADERSHIP_ROLE_IDS`
- `SERVICE_COMMAND_ROLE_MAP`
- `DISCORD_DM_NOTIFICATIONS`
- `FMS_API_BASE_URL`
- `FMS_API_TOKEN`
- `FMS_SYNC_DEBUG`
- `SESSION_SECRET`
- `DATABASE_URL`

`SESSION_SECRET` can be any long random secret. `DATABASE_URL` should come from a Render PostgreSQL database if you want progress to persist reliably.

`COMMAND_ROLE_IDS` and `LEADERSHIP_ROLE_IDS` are comma-separated Discord role IDs. Leadership users automatically get Command permissions too. The bot token is used to read signed-in member roles and send optional DMs, so the bot must be in the Five999 Discord server.

`SERVICE_COMMAND_ROLE_MAP` is optional. Leave it blank if all Command roles can manage all services. To limit Command members to specific services, set it as JSON where each Discord role ID maps to one or more service names:

```json
{
  "123456789012345678": ["United Kingdom Police Service"],
  "234567890123456789": ["United Kingdom Ambulance Service", "Emergency Operations Centre"]
}
```

You can also use a compact Render-friendly format:

```text
123456789012345678=United Kingdom Police Service;234567890123456789=United Kingdom Ambulance Service|Emergency Operations Centre
```

For local testing without `DATABASE_URL`, progress is saved to `data/progress.json`.

Set `DISCORD_DM_NOTIFICATIONS=true` if you want the bot to DM players when they complete a training. This requires `DISCORD_BOT_TOKEN` to be set, and some players may need to allow DMs from server members in Discord.

Set `FMS_API_BASE_URL` to your FMS framework API base, for example `https://yoururl.forcemanagementsystem.com/frameworkapi`, and set `FMS_API_TOKEN` to your FMS website token. Your Render outbound IP must be whitelisted in TASE under the FMS Framework API settings. Each training can then be configured with one or more FMS training group IDs in the Command training editor.

When a player signs in, the dashboard checks their existing FMS training groups. If they already hold the final FMS training group configured on a course, that course is automatically marked as completed on their dashboard. If a practical course has a theory/awaiting-practical FMS group configured, that can also be imported as theory passed while still leaving the practical stage pending.

## Discord OAuth2 Redirect

In the Discord Developer Portal, add this redirect URL:

```text
https://YOUR_RENDER_APP.onrender.com/auth/discord/callback
```

Use the same value for `DISCORD_REDIRECT_URI`.

For the custom Five999 domain, both the Discord Developer Portal redirect and the Render environment value must be exactly:

```text
https://training.fiverpgroup.com/auth/discord/callback
```

Do not include quotes, query parameters, or a trailing slash. If Discord reports `invalid_client`, reset the OAuth2 client secret in the Discord Developer Portal and replace `DISCORD_CLIENT_SECRET` in Render, then redeploy the service. A Discord bot token is not the same as the OAuth2 client secret.

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


## FMS Role Sync Diagnostics

Set `FMS_SYNC_DEBUG=true` in Render to log every FMS role-sync stage. Leave it as `false` to log sync starts, completions, and errors only. Logs include a short **Sync ID**, player Discord ID, course, requested group IDs, safe endpoint path, HTTP status, request duration, FMS response details, and a likely cause. The FMS API token is never written to logs.

When a re-sync fails, the dashboard displays the failed course, HTTP status where available, likely cause, and the Sync ID. Search the Render logs for that Sync ID to see the complete diagnostic trail. Common messages identify invalid Discord IDs, missing FMS configuration, rejected tokens or IP whitelists, incorrect API URLs, rate limits, unavailable FMS services, and invalid training group IDs.

## FMS role re-sync request optimisation

Manual role re-sync now performs one preflight request to load the player's existing FMS groups. The result is cached for the entire sync, so individual courses no longer repeat the same lookup. If the preflight request is rejected (for example 401/403 authentication failure or 429 rate limiting), the sync stops immediately and returns the Sync ID and likely cause without sending requests for every course.
