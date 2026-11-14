const axios = require("axios");

/**
 * Send Transactional Email using Brevo API v3
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content of the email
 */
async function sendTransactionalEmail(to, subject, htmlContent) {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL;
    const senderName = process.env.SENDER_NAME || "Chatbot Assistant";

    if (!apiKey || !senderEmail) {
      console.warn("WARNING: BREVO_API_KEY or SENDER_EMAIL is not set in .env. Email sending skipped.");
      return null;
    }

    const payload = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [
        {
          email: to
        }
      ],
      subject: subject,
      htmlContent: htmlContent
    };

    const response = await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });

    return response.data;
  } catch (error) {
    console.error("Error sending transactional email via Brevo:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  sendTransactionalEmail
};
