const router = require("express").Router();
const chatBotController = require("./chatbotController");
const authentication = require("../middleware/auth");

// NEW Multi-Table Conversation & Message Routes
router.get("/conversations", authentication, chatBotController.getConversations);
router.get("/conversations/:id", authentication, chatBotController.getConversationMessages);
router.delete("/conversations/:id", authentication, chatBotController.deleteConversation);
router.post("/send-message", authentication, chatBotController.sendMessage);

// Legacy Chat Routes (Backward Compatibility)
router.delete("/delete/:id", authentication, chatBotController.deleteChat);
router.get("/get-chats", authentication, chatBotController.getAllChat);
router.get("/get-chat/:id", authentication, chatBotController.getChatById);
router.put("/update-chat/:id", authentication, chatBotController.updateBotChat);

module.exports = router;