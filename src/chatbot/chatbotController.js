const chatbotService = require("../chatbot/chatbotService");
const responseWrapper = require("../helper/wrapper");

class ChatbotController {
  static async getConversations(req, res) {
    try {
      const userId = req.userData.id;
      const conversations = await chatbotService.getConversations(userId);
      return responseWrapper(res, 200, "Successfully retrieved conversations", conversations);
    } catch (error) {
      return responseWrapper(res, error.statusCode || 500, error.message || "Internal Server error", {});
    }
  }

  static async getConversationMessages(req, res) {
    try {
      const userId = req.userData.id;
      const { id } = req.params;
      const conversation = await chatbotService.getConversationMessages(userId, id);
      return responseWrapper(res, 200, "Successfully retrieved conversation messages", conversation);
    } catch (error) {
      return responseWrapper(res, error.statusCode || 500, error.message || "Internal Server error", {});
    }
  }

  static async sendMessage(req, res) {
    try {
      const userId = req.userData.id;
      const { userInput, conversationId, promptType = "sosmed_mastermind", tone } = req.body || {};

      if (!userInput) {
        return responseWrapper(res, 400, "User input is required", {});
      }

      const result = await chatbotService.sendMessage({
        userId,
        userInput,
        conversationId,
        promptType,
        tone
      });

      return responseWrapper(res, 200, "Message sent successfully", result);
    } catch (error) {
      return responseWrapper(res, error.statusCode || 500, error.message || "Internal Server error", {});
    }
  }

  static async deleteConversation(req, res) {
    try {
      const userId = req.userData.id;
      const { id } = req.params;
      await chatbotService.deleteConversationById(userId, id);
      return responseWrapper(res, 200, "Successfully deleted conversation", {});
    } catch (error) {
      return responseWrapper(res, error.statusCode || 500, error.message || "Internal Server error", {});
    }
  }

  // Legacy Chat Handler
  static async chat(req, res) {
    try {
      const userId = req.userData.id;
      const { userInput, conversationId, promptType = "sosmed_mastermind", tone } = req.body || {};

      if (!userInput) {
        return responseWrapper(res, 400, "User input is required", {});
      }

      const result = await chatbotService.sendMessage({
        userId,
        userInput,
        conversationId,
        promptType,
        tone
      });

      return responseWrapper(res, 200, "Chat processed successfully", {
        userId,
        userInput,
        promptType,
        botReply: result.botReply,
        conversationId: result.conversationId
      });
    } catch (error) {
      return responseWrapper(res, error.statusCode || 500, error.message || "Internal Server error", {});
    }
  }

  static async deleteChat(req, res) {
    try {
      const { id } = req.params;
      const deleteChat = await chatbotService.deleteChatById(id);
      return responseWrapper(res, 201, "Successfully Delete Chat", { deleteChat });
    } catch (error) {
      return responseWrapper(res, error.statusCode || 400, error.message, {});
    }
  }

  static async getChatById(req, res) {
    try {
      const { id } = req.params;
      const getChat = await chatbotService.getChatById(id);
      return responseWrapper(res, 201, "Successfully Chat By Id", getChat);
    } catch (error) {
      return responseWrapper(res, error.statusCode || 400, error.message, {});
    }
  }

  static async getAllChat(req, res) {
    try {
      const userId = req.userData.id;
      const getAllChats = await chatbotService.getAllChat(userId);
      return responseWrapper(res, 201, "Successfully Get All Chat", getAllChats);
    } catch (error) {
      return responseWrapper(res, error.statusCode || 400, error.message, {});
    }
  }

  static async updateBotChat(req, res) {
    try {
      const { id } = req.params;
      const { newPrompt, tone } = req.body || {};

      if (!newPrompt) {
        return res.status(400).json({ message: "Prompt tidak boleh kosong" });
      }

      const updatedChat = await chatbotService.updateChatbot(id, newPrompt, tone);

      if (!updatedChat || !updatedChat.botReply) {
        return res.status(500).json({ message: "Gagal memperbarui chat" });
      }

      return responseWrapper(res, 200, "Successfully updated chat", {
        userInput: newPrompt,
        botReply: updatedChat.botReply
      });
    } catch (error) {
      return responseWrapper(res, error.statusCode || 500, error.message, {});
    }
  }
}

module.exports = ChatbotController;