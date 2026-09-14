/**
 * @fde/foundry — Azure AI Foundry, with short-lived credentials.
 *
 * A DEPLOYMENT adapter, not a domain one. It knows about Azure and about the
 * OpenAI-compatible surface Foundry exposes; it knows nothing about what you
 * are building. A customer on AWS writes a sibling of this and changes nothing
 * else.
 *
 * THE PROPERTY THIS EXISTS TO PRESERVE: **no stored API key, anywhere.** The
 * credential is an Entra token fetched per request and cached by the SDK, which
 * means there is no secret in `.env`, none in a container image, and none to
 * rotate after somebody pastes a terminal into a chat window.
 *
 * That is also why the token goes on through a custom `fetch` rather than the
 * client's `apiKey` field: the SDK takes a static string, not a provider it
 * calls each time, so something has to set the header per request.
 */
export { FOUNDRY_SCOPE, env, credential, openaiClient } from './client';
