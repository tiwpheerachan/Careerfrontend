/**
 * @hrefcl/apidoc (the API docs build) depends on puppeteer, but this app never
 * starts a browser. Skip puppeteer's Chrome download on install — locally and on
 * Render, whatever the service's env vars say.
 */
module.exports = { skipDownload: true };
