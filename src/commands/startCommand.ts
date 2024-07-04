import TelegramBot, { Message } from "node-telegram-bot-api";
import { isAuthenticated } from "./authCommand";

export const startCommand = (bot: TelegramBot, msg: Message) => {
    const chatId = msg.chat.id;
    
    if (!isAuthenticated(chatId)) {
        bot.sendMessage(chatId, 'Вітаю в контрольній панелі адміністратора фотостудії. Потрібно авторизуватись');
        return;
    }

    bot.sendMessage(chatId, 'Ви авторизовані! Вам доступні команди адміністратора')
}