const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const {
    YoutubeTranscript,
    YoutubeTranscriptDisabledError,
    YoutubeTranscriptNotAvailableError,
    YoutubeTranscriptVideoUnavailableError,
    YoutubeTranscriptTooManyRequestError,
    YoutubeTranscriptNotAvailableLanguageError
} = require('youtube-transcript');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ApiError } = require('./error');

const execPromise = util.promisify(exec);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Ekstraksi 11-karakter YouTube Video ID dan informasi terkait dari input teks
 */
function extractYouTubeInfo(input) {
    if (!input || typeof input !== 'string') return null;

    // Regex mencakup: watch?v=, shorts/, embed/, youtu.be/, dan parameter tambahan (?feature=share, ?si=, dll)
    const regex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?.*?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s]*)/i;
    const match = input.match(regex);

    if (match) {
        const fullUrl = match[0];
        const videoId = match[1];
        const isShorts = fullUrl.toLowerCase().includes('/shorts/');
        return {
            videoId,
            url: fullUrl,
            isShorts
        };
    }

    // Jika user menginput 11 karakter ID secara langsung
    const trimmed = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
        return {
            videoId: trimmed,
            url: `https://www.youtube.com/watch?v=${trimmed}`,
            isShorts: false
        };
    }

    return null;
}

/**
 * Mengelompokkan error dari library youtube-transcript agar penanganan tepat sasaran
 */
function categorizeYouTubeError(error, videoId) {
    if (error instanceof YoutubeTranscriptDisabledError) {
        return {
            type: "TRANSCRIPT_DISABLED",
            statusCode: 422,
            message: `Subtitle/transkrip dinonaktifkan pada video (${videoId}).`,
            canFallback: true
        };
    }

    if (error instanceof YoutubeTranscriptNotAvailableError) {
        return {
            type: "TRANSCRIPT_NOT_AVAILABLE",
            statusCode: 422,
            message: `Tidak ada subtitle/CC otomatis yang tersedia untuk video (${videoId}).`,
            canFallback: true
        };
    }

    if (error instanceof YoutubeTranscriptNotAvailableLanguageError) {
        return {
            type: "LANGUAGE_NOT_AVAILABLE",
            statusCode: 422,
            message: `Bahasa subtitle yang diminta tidak tersedia untuk video (${videoId}).`,
            canFallback: true
        };
    }

    if (error instanceof YoutubeTranscriptVideoUnavailableError) {
        return {
            type: "VIDEO_UNAVAILABLE",
            statusCode: 404,
            message: `Video YouTube (${videoId}) tidak tersedia, bersifat privat, atau dibatasi usia/wilayah.`,
            canFallback: false
        };
    }

    if (error instanceof YoutubeTranscriptTooManyRequestError) {
        return {
            type: "RATE_LIMITED",
            statusCode: 429,
            message: "YouTube membatasi request dari server saat ini (Too Many Requests / CAPTCHA). Silakan coba lagi beberapa saat lagi.",
            canFallback: false
        };
    }

    // Secondary message matching untuk error umum
    const msg = error.message || "";
    if (msg.includes("No transcripts are available") || msg.includes("Transcript is disabled")) {
        return {
            type: "TRANSCRIPT_NOT_AVAILABLE",
            statusCode: 422,
            message: `Subtitle tidak tersedia pada video (${videoId}).`,
            canFallback: true
        };
    }

    return {
        type: "GENERAL_ERROR",
        statusCode: 400,
        message: `Gagal mengambil transkrip YouTube: ${msg}`,
        canFallback: false
    };
}

/**
 * Mengecek ketersediaan command yt-dlp pada sistem
 */
async function checkYtDlpAvailable() {
    try {
        await execPromise('yt-dlp --version');
        return true;
    } catch {
        return false;
    }
}

/**
 * Download audio video YouTube menggunakan yt-dlp
 */
async function downloadAudioWithYtDlp(videoId) {
    const tempDir = path.join(__dirname, '../../tmp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const outputPath = path.join(tempDir, `${videoId}_${Date.now()}.mp3`);
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Download audio saja dengan bitrate rendah agar proses cepat dan ukuran file kecil
    const command = `yt-dlp -x --audio-format mp3 --audio-quality 5 --max-filesize 25M -o "${outputPath}" "${youtubeUrl}"`;

    try {
        await execPromise(command, { timeout: 60000 });
        if (fs.existsSync(outputPath)) {
            return outputPath;
        }
        throw new Error("File audio hasil unduhan tidak ditemukan.");
    } catch (err) {
        // Bersihkan jika ada file sisa parsial
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
        throw new Error(`Gagal mengunduh audio YouTube dengan yt-dlp: ${err.message}`);
    }
}

/**
 * Mentranskripsikan file audio menggunakan Google Gemini Multimodal Audio
 */
async function transcribeAudioWithGemini(audioFilePath) {
    const audioBuffer = fs.readFileSync(audioFilePath);
    const base64Audio = audioBuffer.toString("base64");

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
    });

    const prompt = "Tolong transkripsikan seluruh percakapan/suara yang ada dalam file audio ini kata demi kata secara akurat dan lengkap. Tuliskan HANYA teks transkripnya saja tanpa kalimat pembuka, penutup, atau tanda kurung.";

    const result = await model.generateContent([
        {
            inlineData: {
                mimeType: "audio/mp3",
                data: base64Audio
            }
        },
        { text: prompt }
    ]);

    const transcriptText = result.response.text();
    return transcriptText ? transcriptText.trim() : "";
}

/**
 * Mengambil transkrip YouTube dengan strategi:
 * 1. Ambil subtitle/CC via youtube-transcript menggunakan 11-karakter video ID
 * 2. Fallback: jika subtitle tidak ada, unduh audio via yt-dlp & transkrip via Gemini Audio
 */
async function getYouTubeTranscriptOrFallback(videoId, originalUrl) {
    try {
        // 1. Eksekusi cepat: fetch subtitle YouTube resmi/otomatis
        // PENTING: Oper hanya videoId (11 karakter), jangan full URL!
        const transcriptArray = await YoutubeTranscript.fetchTranscript(videoId);

        if (transcriptArray && transcriptArray.length > 0) {
            return {
                source: "youtube_caption",
                text: transcriptArray.map(item => item.text).join(" ")
            };
        }

        throw new YoutubeTranscriptNotAvailableError(videoId);
    } catch (error) {
        const errorInfo = categorizeYouTubeError(error, videoId);

        // Jika error bukan karena ketiadaan subtitle (misal video private atau kena rate limit), lempar error spesifik
        if (!errorInfo.canFallback) {
            throw new ApiError(errorInfo.statusCode, errorInfo.message);
        }

        console.warn(`[YouTube] Subtitle bawaan tidak tersedia untuk video ${videoId} (${errorInfo.type}). Memulai fallback transkripsi audio...`);

        // Cek ketersediaan yt-dlp
        const isYtDlpAvailable = await checkYtDlpAvailable();
        if (!isYtDlpAvailable) {
            throw new ApiError(
                errorInfo.statusCode,
                `${errorInfo.message} (Video tidak memiliki subtitle/CC bawaan. Untuk mengaktifkan transkripsi audio AI otomatis, pastikan 'yt-dlp' terpasang di server).`
            );
        }

        // Jalankan Fallback: yt-dlp -> Gemini Multimodal Audio STT
        let tempAudioPath = null;
        try {
            console.log(`[YouTube Fallback] Mengunduh audio untuk video ${videoId}...`);
            tempAudioPath = await downloadAudioWithYtDlp(videoId);

            console.log(`[YouTube Fallback] Mentranskripsikan audio dengan Gemini...`);
            const fallbackTranscript = await transcribeAudioWithGemini(tempAudioPath);

            if (!fallbackTranscript) {
                throw new Error("Transkripsi audio tidak menghasilkan teks (kemungkinan video hanya berisi musik tanpa vokal).");
            }

            return {
                source: "audio_transcription_fallback",
                text: fallbackTranscript
            };
        } catch (fallbackError) {
            console.error(`[YouTube Fallback Error]:`, fallbackError.message);
            throw new ApiError(
                422,
                `Gagal mengambil transkrip: Video tidak memiliki CC bawaan, dan proses fallback audio gagal (${fallbackError.message}).`
            );
        } finally {
            // Selalu hapus file temporary audio setelah selesai
            if (tempAudioPath && fs.existsSync(tempAudioPath)) {
                try {
                    fs.unlinkSync(tempAudioPath);
                } catch (cleanupErr) {
                    console.error("Gagal menghapus file audio temporary:", cleanupErr.message);
                }
            }
        }
    }
}

/**
 * Helper utama untuk chatbotService: mendeteksi URL YouTube dan menyisipkan transkrip
 */
async function extractTranscriptIfNeeded(input) {
    if (!input) return input;

    const ytInfo = extractYouTubeInfo(input);
    if (!ytInfo) return input;

    console.log(`Mendeteksi link YouTube (${ytInfo.isShorts ? 'Shorts' : 'Video Biasa'}), Video ID: ${ytInfo.videoId}`);

    const result = await getYouTubeTranscriptOrFallback(ytInfo.videoId, ytInfo.url);

    const sourceLabel = result.source === "audio_transcription_fallback"
        ? "[Transkrip Audio AI (Fallback - Video Tanpa CC Bawaan)]"
        : `[Transkrip Video Asli dari ${ytInfo.url}]`;

    return `${input}\n\n${sourceLabel}:\n${result.text}`;
}

module.exports = {
    extractYouTubeInfo,
    categorizeYouTubeError,
    getYouTubeTranscriptOrFallback,
    extractTranscriptIfNeeded
};
