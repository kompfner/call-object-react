/**
 * Create a short-lived room for demo purposes.
 *
 * It uses the redirect proxy as specified in netlify.toml`
 * This will work locally if you following the Netlify specific instructions
 * in README.md
 *
 * See https://docs.daily.co/reference#create-room for more information on how
 * to use the Daily REST API to create rooms and what options are available.
 */
async function createRoom() {
  return { url: 'https://paulk.staging.daily.co/hello' };
  // return { url: 'https://paulk.daily.co/hello' };
  // return {
  //   url: 'https://paulk.ngrok.io/hello',
  // };
  // return {
  //   url: 'https://paulk.ngrok.io/hello?bypassRegionDetection=true',
  // };
  // return {
  //   url: 'https://paulk.ngrok.io/hello?apiHost=paulk.ngrok.io',
  // };
}

export default { createRoom };
