const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

// Function to send push notifications
const sendPushNotification = async (pushTokens, title, body, data = {}) => {
  let messages = [];
  
  for (let pushToken of pushTokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      continue;
    }

    messages.push({
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    });
  }

  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];

  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
  
  return tickets;
};

module.exports = { sendPushNotification }; 