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
        // Hapus komentar developer (<!-- ... -->) agar bersih saat dikirim ke Gemini
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
    // Cek apakah di dalam input terdapat link YouTube (watch, youtu.be, atau shorts)
    const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[^\s&]+)/i;
    const match = input.match(urlRegex);

    if (match) {
        try {
            const url = match[0];
            console.log("Mendeteksi link YouTube, mengambil transkrip untuk:", url);
            const transcriptArray = await YoutubeTranscript.fetchTranscript(url);
            if (transcriptArray && transcriptArray.length > 0) {
                const fetchedText = transcriptArray.map(item => item.text).join(" ");
                // Gabungkan instruksi user dengan transkrip asli dari video
                return `${input}\n\n[Transkrip Video Asli dari ${url}]:\n${fetchedText}`;
            }
        } catch (error) {
            console.warn("Gagal fetch transkrip dari YouTube URL:", error.message);
            throw new ApiError(400, `Gagal mengambil subtitle/CC otomatis dari link YouTube tersebut (${error.message}). Pastikan video memiliki subtitle yang aktif atau paste teks transkripnya secara manual.`);
        }
    }
    return input;
}

async function sendChatbot(userId, userInput, promptType = "sosmed_mastermind", tone = "Kasual, Cepat, dan Menarik") {
    try {
        const chatRecord = await prisma.chat.create({
            data: { 
                userId, 
                userInput, 
                botReply: null,
                promptType
            }
        });

        // Ekstrak transkrip YouTube jika input mengandung link YouTube
        const processedInput = await extractTranscriptIfNeeded(userInput);
        let resultText = "";

        if (promptType === "youtube_repurpose" || promptType === "prompt_youtube") {
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

        await prisma.chat.update({
            where: { id: chatRecord.id },
            data: { botReply }
        });

        return formatReply(botReply, promptType);
    } catch (error) {
        console.error("Chatbot API Error:", error.message);
        throw new ApiError(error.statusCode || 400, error.message);
    }
}

async function deleteChatById(chatId) {
    try {
        const chat = await prisma.chat.findUnique({
            where: { id: chatId },
        });

        if (!chat) {
            throw new ApiError(404, "Chat not found");
        }
        
        const deleteChat = await prisma.chat.delete({
            where: { id: chatId },
        });

        return deleteChat;
    } catch (error) {
        console.error("failed delete chat", error.response?.data || error.message);
        throw new ApiError(error.statusCode || 400, error.message); 
    }
}

async function getChatById(chatId) {
    try {
        const chat = await prisma.chat.findUnique({
            where: { id: chatId },
        });
    
        if (!chat) {
            throw new ApiError(404, "Chat not found");
        }

        return { ...chat, botReply: formatReply(chat.botReply, chat.promptType) };
    } catch (error) {
        console.error("failed to get chat ByID", error.response?.data || error.message);
        throw new ApiError(error.statusCode || 400, error.message); 
    }
}

async function getAllChat(userId) {
    try {
        const chats = await prisma.chat.findMany({
            where: { userId },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return chats.map(chat => ({
            ...chat,
            botReply: formatReply(chat.botReply, chat.promptType)
        }));
    } catch (error) {
        console.error("Failed To Get All Chat", error.response?.data || error.message);
        throw new ApiError(error.statusCode || 400, error.message); 
    }
}

async function updateChatbot(chatId, newPrompt, tone = "Kasual, Cepat, dan Menarik") {
    try {
        const chatRecord = await prisma.chat.findUnique({ where: { id: chatId } });
        if (!chatRecord) throw new ApiError(404, "Chat tidak ditemukan");

        const promptType = chatRecord.promptType || "sosmed_mastermind";
        // Ekstrak transkrip YouTube jika newPrompt mengandung link YouTube
        const processedInput = await extractTranscriptIfNeeded(newPrompt);
        let resultText = "";

        if (promptType === "youtube_repurpose" || promptType === "prompt_youtube") {
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

        if (!resultText) {
            throw new Error("Gagal mendapatkan teks dari Gemini API");
        }

        const updatedChat = await prisma.chat.update({
            where: { id: chatId },
            data: { 
                userInput: newPrompt,
                botReply: resultText 
            }
        });

        return { ...updatedChat, botReply: formatReply(updatedChat.botReply, promptType) };
    } catch (error) {
        console.error("Update Chatbot Error:", error?.response?.data || error?.message);
        throw new ApiError(error?.statusCode || 500, error?.message);
    }
}

module.exports = {
    sendChatbot,
    deleteChatById,
    getChatById,
    getAllChat,
    updateChatbot
};