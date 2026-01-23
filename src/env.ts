import { type } from "arktype";

const envSchema = type({
  SLACK_BOT_TOKEN: "string",
  SLACK_APP_TOKEN: "string",
  CDN_CHANNEL_ID: "string",
  CDN_API_KEY: "string",
});

const result = envSchema(process.env);

if (result instanceof type.errors) {
  console.error("Invalid environment variables:", result.summary);
  process.exit(1);
}

export const env = result;
