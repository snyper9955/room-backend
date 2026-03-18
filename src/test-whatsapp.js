require("dotenv").config();
const sendWhatsAppMessage = require("./utils/whatsapp");

const testMessage = async () => {
  const targetNumber = "+919835958271"; // Updated number from user
  const messageBody = "🚀 Hello! This is a random test message from your Smart Room Management System. WhatsApp notifications are now officially active!";

  console.log(`Attempting to send test message to ${targetNumber}...`);
  
  try {
    await sendWhatsAppMessage(targetNumber, messageBody);
    console.log("Test execution completed successfully.");
  } catch (error) {
    console.error("Test execution failed. Ensure .env has correct TWILIO keys.");
  }
};

testMessage();
