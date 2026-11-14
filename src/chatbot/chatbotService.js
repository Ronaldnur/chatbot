const prisma = require('../../prisma/prismaClient');
require("dotenv").config();
const { ApiError } = require('../helper/error');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const { YoutubeTranscript } = require('youtube-transcript');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function getPromptContent(promptType) {
    try {
        let fileName = "system_prompt.md";
        if (promptType === "youtube_repurpose" || promptType === "prompt_youtube") {
            fileName = "prompt_youtube.md";
        }
        const promptPath = path.join(__dirname, "../../", fileName);
        let content = fs.readFileSync(promptPath, "utf-8");
        content = content.replace(/<!--[\s\S]*?-->/g, "").trim();
        return content;
    } catch (error) {
        console.error(`Gagal membaca file prompt (${promptType}):`, error.message);
        return "";
    }
}

function formatReply(botReply, promptType) {
    if (!botReply) return botReply;
    if (promptType === "youtube_repurpose" || promptType === "prompt_youtube") {
        try {
            return JSON.parse(botReply);
        } catch (e) {
            return botReply;
        }
    }
    return botReply;
}

async function extractTranscriptIfNeeded(input) {
    if (!input) return input;
    const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[^\s&]+)/i;
    const match = input.match(urlRegex);

    if (match) {
        try {
            const url = match[0];
            console.log("Mendeteksi link YouTube, mengambil transkrip untuk:", url);
            const transcriptArray = await YoutubeTranscript.fetchTranscript(url);
            if (transcriptArray && transcriptArray.length > 0) {
                const fetchedText = transcriptArray.map(item => item.text).join(" ");
                return `${input}\n\n[Transkrip Video Asli dari ${url}]:\n${fetchedText}`;
            }
        } catch (error) {
            console.warn("Gagal fetch transkrip dari YouTube URL:", error.message);
            throw new ApiError(400, `Gagal mengambil subtitle/CC otomatis dari link YouTube tersebut (${error.message}).`);
        }
    }
    return input;
}

/**
 * NEW LOGIC: Multi-Table Conversation & Message Service
 */

async function getConversations(userId) {
    try {
        const conversations = await prisma.conversation.findMany({
            where: { userId },
            select: {
                id: true,
                title: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return conversations;
    } catch (error) {
        console.error("Failed to get conversations:", error.message);
        throw new ApiError(error.statusCode || 400, error.message);
    }
}

async function getConversationMessages(userId, conversationId) {
    try {
        const conversation = await prisma.conversation.findFirst({
            where: { id: conversationId, userId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!conversation) {
            throw new ApiError(404, "Conversation not found");
        }

        return conversation;
    } catch (error) {
        console.error("Failed to get conversation messages:", error.message);
        throw new ApiError(error.statusCode || 400, error.message);
    }
}

async function sendMessage({ userId, userInput, conversationId, promptType = "sosmed_mastermind", tone = "Kasual, Cepat, dan Menarik" }) {
    try {
        let conversation;

        if (conversationId) {
            // Lanjut Sesi: pastikan sesi milik user tersebut ada dan TIDAK mengubah title obrolan
            conversation = await prisma.conversation.findFirst({
                where: { id: conversationId, userId }
            });

            if (!conversation) {
                throw new ApiError(404, "Conversation not found");
            }
        } else {
            // Sesi Baru: buat data baru di tabel Conversation dengan title = userInput
            const title = userInput.trim().slice(0, 100);
            conversation = await prisma.conversation.create({
                data: {
                    userId,
                    title: title,
                    promptType: promptType
                }
            });
        }

        // Simpan pesan user ke tabel Message
        const userMessage = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                sender: "user",
                content: userInput
            }
        });

        // Proses balasan AI via Gemini API
        const activePromptType = conversation.promptType || promptType;
        const processedInput = await extractTranscriptIfNeeded(userInput);
        let resultText = "";

        if (activePromptType === "youtube_repurpose" || activePromptType === "prompt_youtube") {
            let template = getPromptContent("youtube_repurpose");
            let prompt = template.replace(/\{\{youtube_transcript\}\}/g, processedInput)
                                 .replace(/\{\{tone\}\}/g, tone || "Kasual, Cepat, dan Menarik");

            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });
            const result = await model.generateContent(prompt);
            resultText = result.response.text();
        } else {
            const systemInstruction = getPromptContent("sosmed_mastermind");
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: systemInstruction
            });
            const result = await model.generateContent(processedInput);
            resultText = result.response.text();
        }

        const botReply = resultText || "Error generating response";

        // Simpan balasan AI ke tabel Message
        const aiMessage = await prisma.message.create({
            data: {
                conversationId: conversation.id,
                sender: "ai",
                content: botReply
            }
        });

        // Simpan juga ke tabel Chat lama (backward compatibility)
        await prisma.chat.create({
            data: {
                userId,
                userInput,
                botReply,
                promptType: activePromptType
            }
        }).catch(() => {});

        return {
            conversationId: conversation.id,
            title: conversation.title,
            botReply: formatReply(botReply, activePromptType),
            userMessage,
            aiMessage
        };
    } catch (error) {
        console.error("Chatbot API Error:", error.message);
        throw new ApiError(error.statusCode || 400, error.message);
    }
}

async function deleteConversationById(userId, conversationId) {
    try {
        const conversation = await prisma.conversation.findFirst({
            where: { id: conversationId, userId }
        });

        if (!conversation) {
            throw new ApiError(404, "Conversation not found");
        }

        return await prisma.conversation.delete({
            where: { id: conversationId }
        });
    } catch (error) {
        throw new ApiError(error.statusCode || 400, error.message);
    }
}

/**
 * LEGACY CHAT FUNCTIONS (maintained for backward compatibility)
 */
async function sendChatbot(userId, userInput, promptType = "sosmed_mastermind", tone = "Kasual, Cepat, dan Menarik") {
    return sendMessage({ userId, userInput, promptType, tone });
}

async function deleteChatById(chatId) {
    try {
        const chat = await prisma.chat.findUnique({ where: { id: chatId } });
        if (!chat) throw new ApiError(404, "Chat not found");
        return await prisma.chat.delete({ where: { id: chatId } });
    } catch (error) {
        throw new ApiError(error.statusCode || 400, error.message);
    }
}

async function getChatById(chatId) {
    try {
        const chat = await prisma.chat.findUnique({ where: { id: chatId } });
        if (!chat) throw new ApiError(404, "Chat not found");
        return { ...chat, botReply: formatReply(chat.botReply, chat.promptType) };
    } catch (error) {
        throw new ApiError(error.statusCode || 400, error.message);
    }
}

async function getAllChat(userId) {
    try {
        const chats = await prisma.chat.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        return chats.map(chat => ({
            ...chat,
            botReply: formatReply(chat.botReply, chat.promptType)
        }));
    } catch (error) {
        throw new ApiError(error.statusCode || 400, error.message);
    }
}

async function updateChatbot(chatId, newPrompt, tone = "Kasual, Cepat, dan Menarik") {
    try {
        const chatRecord = await prisma.chat.findUnique({ where: { id: chatId } });
        if (!chatRecord) throw new ApiError(404, "Chat tidak ditemukan");

        const promptType = chatRecord.promptType || "sosmed_mastermind";
        const processedInput = await extractTranscriptIfNeeded(newPrompt);
        let resultText = "";

        if (promptType === "youtube_repurpose" || promptType === "prompt_youtube") {
            let template = getPromptContent("youtube_repurpose");
            let prompt = template.replace(/\{\{youtube_transcript\}\}/g, processedInput)
                                 .replace(/\{\{tone\}\}/g, tone || "Kasual, Cepat, dan Menarik");

            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: { responseMimeType: "application/json" }
            });
            const result = await model.generateContent(prompt);
            resultText = await result.response.text();
        } else {
            const systemInstruction = getPromptContent("sosmed_mastermind");
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: systemInstruction
            });
            const result = await model.generateContent(processedInput);
            resultText = await result.response.text();
        }

        const updatedChat = await prisma.chat.update({
            where: { id: chatId },
            data: { userInput: newPrompt, botReply: resultText }
        });

        return { ...updatedChat, botReply: formatReply(updatedChat.botReply, promptType) };
    } catch (error) {
        throw new ApiError(error.statusCode || 500, error.message);
    }
}

module.exports = {
    getConversations,
    getConversationMessages,
    sendMessage,
    deleteConversationById,
    sendChatbot,
    deleteChatById,
    getChatById,
    getAllChat,
    updateChatbot
};