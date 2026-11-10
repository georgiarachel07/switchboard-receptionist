# Switchboard Receptionist

**Made by Georgia.** Free, MIT-licensed source for a voice receptionist serving dental practices, repair shops and retail stores.

**[Try the call studio](https://georgiarachel07.github.io/switchboard-receptionist/)**. Choose a front desk and a scenario, play the caller, and optionally hear the receptionist with your browser's speech synthesis. The public website uses fictional contacts and local sample conversations. No microphone, credentials or registration are required.

## Run the phone service

The Python service accepts signed incoming SIP-call webhooks, opens an OpenAI Realtime sideband WebSocket, handles tool calls and lets the voice provider handle audio and interrupted speech. A persistent SQLite database is the appointment calendar for one location. This version does not synchronize an existing practice-management or Google calendar. Only enable it for resources whose availability is managed here.

1. Install Python 3.11 or later. Create a virtual environment and run `python -m pip install -r requirements.txt`.
2. Copy `business.example.json` to `business.json`. Set the real business name, street address, IANA time zone, opening hours (Monday is 0), booking URL and mode (`dental`, `auto`, or `retail`). Select one deployment per location/line. Enable a waiting bay only when it is allocated to this calendar. Update retail stock to match the actual store; the supplied inventory is sample data.
3. Configure the environment variables below through your hosting providerâ€™s secret manager. Supply real staff and SMS workflow receivers. Set a persistent disk for SQLite.
4. Start `uvicorn voice:app --host 0.0.0.0 --port 8000 --workers 1` behind HTTPS on an always-on Python host with WebSocket egress. Enable automatic restart. Run `python -m unittest -v test_calendar` before connecting a number.
5. In your OpenAI project, register the public HTTPS route `/incoming` for `realtime.call.incoming` and set its signing secret. Route the business number through a SIP trunk to the projectâ€™s OpenAI SIP address. Follow the [official SIP setup](https://developers.openai.com/api/docs/guides/voice-sip?voice-api=realtime). Verify emergency routing, busy/no-answer fallback and your phone carrierâ€™s outage route with staff before forwarding customer calls.
6. Place test calls for each path, check the saved appointment, and verify the receiving systems actually send SMS and display priority messages. The source and website are free. Phone numbers, voice inference, SMS and server hosting can incur charges.

| Variable | Purpose |
|---|---|
| OPENAI_API_KEY, OPENAI_WEBHOOK_SECRET | Server-side Realtime access and incoming signature validation |
| REALTIME_MODEL | Optional, defaults to gpt-realtime |
| BUSINESS_CONFIG | Path to private business.json |
| DATABASE_PATH | Persistent SQLite file, defaults to switchboard.sqlite3 |
| HUMAN_QUEUE_URI | Staff SIP or tel URI, configured by the operator |
| STAFF_WEBHOOK | HTTPS endpoint for priority, unresolved and callback requests |
| SEND_FOLLOWUP_SMS_WEBHOOK | HTTPS endpoint that sends the consented booking link |
| WORKFLOW_SECRET | Shared HMAC signing secret for outbound webhooks |

## Call handling

Dental cleanings reserve 60 minutes, diagnostics 30. Severe pain, bleeding or trauma goes to urgent intake for the location and verified callback. Auto drop-offs reserve 15 minutes. Waiting visits reserve a dedicated bay for an initial hour. Retail supports configured hours, address, returns and SKU/description lookup. A hold request goes to staff for confirmation. Order-specific data requires human verification.

The receptionist requests a day and time window, offers up to two open times, and reads back a confirmed booking. A write transaction prevents overlapping appointments. The voice instructions request fewer than 25 words per turn and distinct spoken times and numbers. Generated speech length is a model instruction rather than a hard word-count guarantee.

The SMS tool requires affirmative consent and a valid mobile number. An unresolved disconnect creates a staff webhook with an unverified caller ID if available. An already disconnected caller cannot consent to SMS. For calls that never reach the SIP service, configure the carrierâ€™s missed-call event or failover route to your staff workflow.

Both webhook receivers must validate `X-Switchboard-Signature` (hex HMAC-SHA256 of the exact request bytes), deduplicate `Idempotency-Key`, and return HTTP 2xx with `{"accepted":true}` only after durable acceptance. The SMS receiver gets the number, business mode and booking URL. The staff receiver gets callback and reason/location when collected. A SIP REFER acknowledgment confirms a transfer request; the downstream phone queue owns ring/no-answer handling. A staff task is attempted before transfer so a busy line can still receive a priority callback. Monitor webhook failures. Configure access controls, retention and backups for stored contacts before using real caller information.

## Website and source

For carrier-reported missed calls, have your trusted carrier adapter validate the provider signature and POST JSON to `/missed` containing `call_id`, `phone` and `sms_consent`. Sign the exact body using the outbound HMAC scheme above. Set consent true only if independently recorded for this purpose. The receiver dispatches a booking-link SMS with consent or a staff callback task otherwise. Retry a 503 with the original event. Do not expose the shared signing secret in browser code.

The static site lives in `docs/`. Serve it with `python -m http.server 8080 --directory docs`, or choose GitHub Pages â†’ main â†’ /docs. Pages hosts the public call studio. The live telephone service runs separately. The MIT license permits reuse and modification with attribution.



