export const ASSISTANT_RETURN_FALLBACK =
  "https://gomo-assistant-v2.gjp86wh7p2.workers.dev/";

const ASSISTANT_PRODUCTION_HOST = "gomo-assistant-v2.gjp86wh7p2.workers.dev";
const ASSISTANT_PREVIEW_HOST =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?-gomo-assistant-v2\.gjp86wh7p2\.workers\.dev$/;

export function resolveAssistantReturnUrl(value) {
  try {
    const candidate = new URL(value);
    const hostnameAllowed =
      candidate.hostname === ASSISTANT_PRODUCTION_HOST ||
      ASSISTANT_PREVIEW_HOST.test(candidate.hostname);

    if (
      candidate.protocol !== "https:" ||
      !hostnameAllowed ||
      candidate.username ||
      candidate.password ||
      candidate.port
    ) {
      return ASSISTANT_RETURN_FALLBACK;
    }

    return candidate.toString();
  } catch {
    return ASSISTANT_RETURN_FALLBACK;
  }
}
