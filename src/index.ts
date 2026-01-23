import { App } from "@slack/bolt";
import { env } from "./env";

const app = new App({
  token: env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: env.SLACK_APP_TOKEN,
});

app.message(async ({ message, client, say }) => {
  if (message.channel !== env.CDN_CHANNEL_ID) return;
  if (message.subtype !== "file_share" || !("files" in message)) return;

  const files = message.files ?? [];

  await client.reactions.add({
    channel: message.channel,
    name: "fidget_spinner",
    timestamp: message.ts,
  });

  const urls = files.map((f) => f.url_private).filter((u): u is string => !!u);

  if (urls.length === 0) return;

  try {
    const cdnResponse = await fetch("https://cdnapi.mahadk.com/api/v3/new", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.CDN_API_KEY}`,
        "X-Download-Authorization": `Bearer ${env.SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify(urls),
    });

    if (!cdnResponse.ok) {
      const errorText = await cdnResponse.text();
      await say({
        text: `CDN upload failed: ${errorText}`,
        thread_ts: message.ts,
      });
      await client.reactions.add({
        channel: message.channel,
        name: "x",
        timestamp: message.ts,
      });
      return;
    }

    const cdnData: { files: { deployedUrl: string }[]; cdnBase: string } =
      await cdnResponse.json();

    await client.reactions.add({
      channel: message.channel,
      name: "tw_white_check_mark",
      timestamp: message.ts,
    });

    await say({
      text:
        `here's your ${cdnData.files.length === 1 ? "file!" : "files!"}\n` +
        cdnData.files.map((f) => f.deployedUrl).join("\n"),
      thread_ts: message.ts,
      unfurl_links: false,
    });
  } catch (error) {
    await say({
      text: `Error: ${error instanceof Error ? error.message : String(error)}`,
      thread_ts: message.ts,
    });
    await client.reactions.add({
      channel: message.channel,
      name: "x",
      timestamp: message.ts,
    });
  }

  await client.reactions.remove({
    channel: message.channel,
    name: "fidget_spinner",
    timestamp: message.ts,
  });
});

await app.start();
console.log("CDN Bot is running");
