import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
import { startCommand } from "./commands/startCommand";
import { authCommand } from "./commands/authCommand";
import { isAuthenticated } from "./commands/authCommand";
import { getBookings, createBooking, updateBooking, deleteBooking } from "./commands/bookingCommands";

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
                deleteBooking(bot, msg);
                break;
            default:
                bot.sendMessage(chatId, 'Невідома команда')
        }
    })

    console.log('Bot started succesfully on', Date())
}

export { startBot }