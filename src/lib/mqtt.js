import mqtt from 'mqtt';

// MQTT over WebSocket for browser compatibility
// test.mosquitto.org supports WebSocket on port 8081 (wss)
const MQTT_BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL || 'wss://test.mosquitto.org:8081/mqtt';
const MQTT_TOPIC = import.meta.env.VITE_MQTT_TOPIC || 'realtime-polling/votes';

let client = null;
let isConnected = false;

function getClient() {
  if (client) return client;

  const options = {
    connectTimeout: 5000, // Timeout after 5s
    reconnectPeriod: 2000, // Reconnect every 2s
  };

  const username = import.meta.env.VITE_MQTT_USERNAME;
  const password = import.meta.env.VITE_MQTT_PASSWORD;
  if (username && password) {
    options.username = username;
    options.password = password;
  }

  // Robust default port handling for MQTT.js in browser environments
  try {
    const parsedUrl = new URL(MQTT_BROKER_URL);
    if (!parsedUrl.port) {
      options.port = parsedUrl.protocol === 'wss:' ? 443 : 80;
      console.log(`ℹ️ No port specified in MQTT Broker URL. Defaulting to port ${options.port} for ${parsedUrl.protocol}`);
    }
  } catch (err) {
    console.warn('⚠️ Parsing MQTT_BROKER_URL failed, relying on defaults:', err);
  }

  client = mqtt.connect(MQTT_BROKER_URL, options);

  client.on('connect', () => {
    isConnected = true;
    console.log('✅ MQTT connected to', MQTT_BROKER_URL);
  });

  client.on('error', (err) => {
    console.error('❌ MQTT error:', err);
    isConnected = false;
  });

  client.on('close', () => {
    isConnected = false;
  });

  return client;
}

/**
 * Publish a vote payload to the MQTT topic for ArcGIS Velocity.
 * Connects lazily on first call.
 */
export function publishVote(votePayload) {
  const mqttClient = getClient();
  const message = JSON.stringify(votePayload);

  return new Promise((resolve, reject) => {
    if (isConnected) {
      mqttClient.publish(MQTT_TOPIC, message, { qos: 1 }, (err) => {
        if (err) {
          console.error('❌ MQTT publish failed:', err);
          reject(err);
        } else {
          console.log(`✅ Published to ${MQTT_TOPIC}`);
          resolve();
        }
      });
    } else {
      // Wait for connection, then publish
      mqttClient.once('connect', () => {
        mqttClient.publish(MQTT_TOPIC, message, { qos: 1 }, (err) => {
          if (err) {
            console.error('❌ MQTT publish failed:', err);
            reject(err);
          } else {
            console.log(`✅ Published to ${MQTT_TOPIC}`);
            resolve();
          }
        });
      });
    }
  });
}
