const twilio = require("twilio");

/**
 * @desc Send a WhatsApp message using Twilio
 * @param {string} to - Recipient phone number (including country code)
 * @param {string} body - The message content
 */
const sendWhatsAppMessage = async (to, body) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !from) {
      console.warn("Twilio credentials not found. WhatsApp message skipped.");
      return;
    }

    const client = twilio(accountSid, authToken);

    // Format the "to" number if it doesn't have the whatsapp: prefix
    const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    const formattedFrom = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;

    const message = await client.messages.create({
      body: body,
      from: formattedFrom,
      to: formattedTo,
    });

    console.log(`WhatsApp message sent successfully: ${message.sid}`);
    return message;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    throw error;
  }
};

module.exports = sendWhatsAppMessage;
