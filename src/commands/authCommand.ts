import TelegramBot, { Message } from "node-telegram-bot-api";
import dotenv from 'dotenv';

dotenv.config()

const authenticatedUsers = new Set<number>();

const authCommand = (bot: TelegramBot, msg: Message) => {
    const chatId = msg.chat.id
    const pw = process.env.ADMIN_PW;

    bot.sendMessage(chatId, 'Введіть пароль')

    const listener = (response: Message) => {
        if (response.text === pw && response.chat.id === chatId) {
            authenticatedUsers.add(chatId);
            bot.sendMessage(chatId, 'Ви успішно авторизувались в контрольну панель адміністратора фотостудії', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Отримати усі бронювання', callback_data: 'get' }],
                        [{ text: 'Створити бронювання', callback_data: 'create' }],
                        [{ text: 'Змінити бронювання', callback_data: 'update' }],
                        [{ text: 'Видалити бронювання', callback_data: 'delete' }]
                    ]
                }
            });
            bot.removeListener('message', listener);
        } else {
            bot.sendMessage(chatId, 'Пароль невірний');
        }
    };

    bot.on('message', listener);
}

const isAuthenticated = (chatId: number) => authenticatedUsers.has(chatId);

export { isAuthenticated, authCommand };