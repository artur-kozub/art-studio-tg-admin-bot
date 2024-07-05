import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
import { startCommand } from "./commands/startCommand";
import { authCommand, isAuthenticated } from "./commands/authCommand";
import { getBookings, createBooking, updateBooking, deleteBooking } from "./commands/bookingCommands";
import axios from "axios";
import cors from 'cors';
import express, { Express } from "express";

const app: Express = express();
const PORT = process.env.EXPRESS_PORT || 5000;

const token = process.env.BOT_TOKEN;
const adminChatId = process.env.ADMIN_CHAT_ID

const chatIds = [
    process.env.ADMIN_CHAT_ID_1,
    process.env.ADMIN_CHAT_ID_2
]

const startBot = (token: string) => {
    const bot = new TelegramBot(token, { polling: true })

    bot.setMyCommands([
        { command: '/start', description: 'Запустити бот' }
    ]);

    bot.onText(/\/start/, (msg) => startCommand(bot, msg))
    bot.onText(/\/auth/, (msg) => authCommand(bot, msg))

    bot.on('callback_query', (callbackQuery: CallbackQuery) => {
        const msg = callbackQuery.message as Message;
        const chatId = msg?.chat.id as number;

        console.log(chatId);

        if (!isAuthenticated(chatId)) {
            bot.sendMessage(chatId, 'Будь ласка, авторизуйтесь за допомогою команди /auth');
            return;
        }

        const data = callbackQuery.data;

        switch (data) {
            case 'get':
                getBookings(bot, msg);
                break;
            case 'create':
                createBooking(bot, callbackQuery);
                break;
            case 'update':
                updateBooking(bot, callbackQuery);
                break;
            case 'delete':
                deleteBooking(bot, callbackQuery);
                break;
            default:
                bot.sendMessage(chatId, 'Невідома команда')
        }
    })

    console.log('Bot started succesfully on', Date())
}

app.use(express.json())
app.use(cors());

app.get('/', (req, res) => {
    res.send('Admin bot is working');
})

app.post('/send-message', async (req, res) => {
    const message = req.body.message

    if (!message) {
        return res.status(401).send('Message is required');
    }

    try {
        const promises = chatIds.map(chatId => {
            return axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                chat_id: chatId,
                text: message,
            });
        });

        await Promise.all(promises);

        res.status(200).send({ message: 'Message sent to admin bot succesfully' })
    } catch (e: any) {
        console.log('Failed to send message to bot', e.message)
        res.status(500).send({ message: e.message })
    }
})

app.listen(PORT, () => {
    console.log('Server for admin bot is working...')
})

console.log('Bot and server initialized successfully');

export { startBot }