import {
  discovery,
  api as hueApi,
  ApiError,
} from 'node-hue-api';

const appName = 'plex-home-automation';
const deviceName = 'webhook-handler';

const username = `${appName}#${deviceName}`;

async function discoverBridge() {
  const discoveryResults = await discovery.nupnpSearch();

  if (discoveryResults.length === 0) {
    console.error('Failed to resolve any Hue Bridges');
    return null;
  } else {
    // Ignoring that you could have more than one Hue Bridge on a network as this is unlikely in 99.9% of users situations
    return discoveryResults[0].ipaddress;
  }
}

async function discoverAndAuthenticate() {
  console.log('Finding bridge...');
  const ipAddress = await discoverBridge();

  if (ipAddress === null) {
    console.error('No Hue Bridge was found. Please try again.');
    return;
  }

  console.log('Bridge found at IP address:', ipAddress);

  console.log('Creating local API instance...');
  // Create an unauthenticated instance of the Hue API so that we can create a new user
  const unauthenticatedApi = await hueApi.createLocal(ipAddress).connect();
  console.log('Local API instance created!')

  let createdUser;
  try {
    console.log('Not found! Trying to create a new user...');
    createdUser = await unauthenticatedApi.users.createUser(appName, deviceName);
    console.log('*******************************************************************************\n');
    console.log('User has been created on the Hue Bridge. The following username can be used to\n' +
      'authenticate with the Bridge and provide full local access to the Hue Bridge.\n' +
      'YOU SHOULD TREAT THIS LIKE A PASSWORD\n');
    console.log(`Hue Bridge User: ${createdUser.username}`);
    console.log(`Hue Bridge User Client Key: ${createdUser.clientkey}`);
    console.log('*******************************************************************************\n');

    console.log('Creating authenticated API instance...');
    // Create a new API instance that is authenticated with the new user we created
    const authenticatedApi = await hueApi.createLocal(ipAddress).connect(username);
    console.log('Created!');

    // Do something with the authenticated user/api
    const bridgeConfig = await authenticatedApi.configuration.getConfiguration();
    console.log(`Connected to Hue Bridge: ${bridgeConfig.name} :: ${bridgeConfig.ipaddress}`);

    return authenticatedApi;
  } catch(err) {
    if (err instanceof ApiError && err.getHueErrorType() === 101) {
      console.error('The Link button on the bridge was not pressed. Please press the Link button and try again.');
    } else {
      console.error('Unexpected error:', err);
    }
  }
}

async function main() {
  // Invoke the discovery and create user code
  const authenticatedApi = await discoverAndAuthenticate();

  if (!authenticatedApi) {
    return;
  }

  // If we have a valid authenticatedApi instance, we can start to use it to interact with the Hue Bridge
  console.log('Authenticated API created!');
  const lights = authenticatedApi.lights.getAll();

  console.log('Getting lights...')
  console.log('lights:', lights);

  // TODO: Upsert the "bulbs" section of the application config file.
}
main();