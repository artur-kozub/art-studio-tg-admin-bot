import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import axios from 'axios';
import moment from 'moment';
import { format, isAfter } from 'date-fns';
import { uk } from 'date-fns/locale';

const getBookings = async (bot: TelegramBot, msg: Message) => {
    const chatId = msg.chat.id;

    try {
        const res = await axios.get(`${process.env.API_INSTANCE}api/bookings/all`);
        const bookings = res.data;

        const now = new Date();

        const approvedBookings = bookings.filter((booking: any) => booking.paymentStatus === 'Approved' && isAfter(new Date(booking.bookingDate), now));

        if (approvedBookings.length === 0) {
            await bot.sendMessage(chatId, 'Знайдено 0 записів')
            return;
        }

        let message = 'Я знайшов наступні записи: \n\n'

        approvedBookings.forEach((booking: any, index: number) => {
            if (booking.paymentStatus === 'Approved') {
                const formatedDate = format(new Date(booking.bookingDate), 'd MMMM yyyy, HH:mm', { locale: uk })
                message += `${index + 1}) Дата: ${formatedDate}\n Кількість годин: ${booking.bookingHours}\n\n`;
            } else {
                bot.sendMessage(chatId, 'Немає оплачених бронювань')
            }
        });

        await bot.sendMessage(chatId, message);
    } catch (e: any) {
        console.log('Fail at getBookings', e.message);
        bot.sendMessage(chatId, 'Fail at getBookings');
    }
}

const createBooking = async (bot: TelegramBot, query: CallbackQuery) => {
    const chatId = query.message?.chat.id as number;

    try {
        await bot.sendMessage(chatId, 'Введіть дані для створення бронювання (формат: ціна, дата в форматі YYYY-MM-DD HH:mm, кількість годин)');

        bot.once('message', async (msg) => {
            const [price, bookingDateInput, bookingHours] = msg.text?.split(',').map(s => s.trim()) || [];

            if (!price || !bookingDateInput || !bookingHours) {
                bot.sendMessage(chatId, 'Неправильний формат даних. Спробуйте ще раз.')
                return;
            }

            const bookingDate = moment(bookingDateInput, 'YYYY-MM-DD HH:mm').toISOString();
            if (!moment(bookingDate, moment.ISO_8601, true).isValid()) {
                bot.sendMessage(chatId, 'Невірний формат дати, спробуйте ще раз')
                return;
            }

            try {
                const res = await axios.post(`${process.env.API_INSTANCE}api/bookings/book?price=${price}`, {
                    bookingDate,
                    bookingHours
                })

                const createdBooking = res.data.booking;
                const formatedDate = format(new Date(createdBooking.bookingDate), 'd MMMM yyyy, HH:mm', { locale: uk })

                await bot.sendMessage(chatId, `Створено запис на ${formatedDate}\nКількість годин: ${createdBooking.bookingHours}\nПотрібно сплатити за цим [посиланням](${process.env.API_INSTANCE}api/payments/payment-form?currency=UAH&productName[]=photosession&productCount[]=1&bookingId=${createdBooking._id})`, {
                    parse_mode: 'Markdown'
                });
            } catch (e: any) {
                if (axios.isAxiosError(e)) {
                    if (e.response) {
                        const status = e.response.status;
                        switch (status) {
                            case 400:
                                await bot.sendMessage(chatId, 'Невірний запит. Перевірте введені дані та спробуйте ще раз.');
                                break;
                            case 404:
                                await bot.sendMessage(chatId, 'Ресурс не знайдено. Спробуйте ще раз пізніше.');
                                break;
                            case 500:
                                await bot.sendMessage(chatId, 'Внутрішня помилка сервера. Спробуйте ще раз пізніше.');
                                break;
                            default:
                                await bot.sendMessage(chatId, `Сталася помилка. Код статусу: ${status}.`);
                        }
                    } else if (e.request) {
                        await bot.sendMessage(chatId, 'Не вдалося отримати відповідь від сервера. Перевірте ваше з’єднання і спробуйте ще раз.');
                    } else {
                        await bot.sendMessage(chatId, `Сталася помилка при налаштуванні запиту: ${e.message}`);
                    }
                } else {
                    await bot.sendMessage(chatId, `Невідома помилка: ${e.message}`);
                }
            }
        })
    } catch (e: any) {
        console.log('Fail at createBooking', e.message)
        bot.sendMessage(chatId, 'Fail at createBooking')
    }
}

const updateBooking = async (bot: TelegramBot, query: CallbackQuery) => {
    const chatId = query.message?.chat.id as number;

    try {
        await bot.sendMessage(chatId, 'Введіть дані для зміни бронювання студії (формат: стара дата в форматі YYYY-MM-DD HH:mm, нова дата в форматі YYYY-MM-DD HH:mm)')

        bot.once('message', async (msg) => {
            const [oldBookingDateInput, newBookingDateInput] = msg.text?.split(',').map(s => s.trim()) || [];
            if (!oldBookingDateInput || !newBookingDateInput) {
                bot.sendMessage(chatId, 'Неправильний формат даних. Спробуйте ще раз.')
                return;
            }

            const oldBookingDate = moment(oldBookingDateInput, 'YYYY-MM-DD HH:mm').toISOString();
            const newBookingDate = moment(newBookingDateInput, 'YYYY-MM-DD HH:mm').toISOString();
            if (!moment(oldBookingDate, moment.ISO_8601, true).isValid() && !moment(newBookingDate, moment.ISO_8601, true).isValid()) {
                bot.sendMessage(chatId, 'Невірний формат дати, спробуйте ще раз')
                return;
            }

            try {
                const res = await axios.put(`${process.env.API_INSTANCE}api/bookings/update`, {
                    newBookingDate,
                    oldBookingDate
                })
                const data = res.data
                console.log(data);

                await bot.sendMessage(chatId, 'Бронювання успішно змінено');
            } catch (e: any) {
                if (axios.isAxiosError(e)) {
                    if (e.response) {
                        const status = e.response.status;
                        switch (status) {
                            case 400:
                                await bot.sendMessage(chatId, 'Невірний запит. Перевірте введені дані та спробуйте ще раз.');
                                break;
                            case 404:
                                await bot.sendMessage(chatId, 'Ресурс не знайдено. Спробуйте ще раз пізніше.');
                                break;
                            case 500:
                                await bot.sendMessage(chatId, 'Внутрішня помилка сервера. Спробуйте ще раз пізніше.');
                                break;
                            default:
                                await bot.sendMessage(chatId, `Сталася помилка. Код статусу: ${status}.`);
                        }
                    } else if (e.request) {
                        await bot.sendMessage(chatId, 'Не вдалося отримати відповідь від сервера. Перевірте ваше з’єднання і спробуйте ще раз.');
                    } else {
                        await bot.sendMessage(chatId, `Сталася помилка при налаштуванні запиту: ${e.message}`);
                    }
                } else {
                    await bot.sendMessage(chatId, `Невідома помилка: ${e.message}`);
                }
            }
        })
    } catch (e: any) {
        console.log('Fail at updateBooking', e.message)
        bot.sendMessage(chatId, 'Fail at updateBooking')
    }

    bot.sendMessage(chatId, 'Змінити запис');
}

const deleteBooking = async (bot: TelegramBot, query: CallbackQuery) => {
    const chatId = query.message?.chat.id as number;

    try {
        await bot.sendMessage(chatId, 'Введіть дату для видалення бронювання (формат: дата в форматі YYYY-MM-DD HH:mm)')

        bot.once('message', async (msg) => {
            const bookingDateToDeleteInput = msg.text?.trim() || '';
            if (!bookingDateToDeleteInput) {
                bot.sendMessage(chatId, 'Неправильний формат даних. Спробуйте ще раз.')
                return;
            }

            const bookingDateToDelete = moment(bookingDateToDeleteInput, 'YYYY-MM-DD HH:mm').toISOString();
            if (!moment(bookingDateToDelete, moment.ISO_8601, true).isValid()) {
                bot.sendMessage(chatId, 'Невірний формат дати, спробуйте ще раз')
                return;
            }

            try {
                const res = await axios.delete(`${process.env.API_INSTANCE}api/bookings/delete`, {
                    data: {
                        bookingDate: bookingDateToDelete
                    }
                });

                const data = res.data
                console.log(data);

                await bot.sendMessage(chatId, 'Бронювання видалено успішно')
            } catch (e: any) {
                if (axios.isAxiosError(e)) {
                    if (e.response) {
                        const status = e.response.status;
                        switch (status) {
                            case 400:
                                await bot.sendMessage(chatId, 'Невірний запит. Перевірте введені дані та спробуйте ще раз.');
                                break;
                            case 404:
                                await bot.sendMessage(chatId, 'Ресурс не знайдено. Спробуйте ще раз пізніше.');
                                break;
                            case 500:
                                await bot.sendMessage(chatId, 'Внутрішня помилка сервера. Спробуйте ще раз пізніше.');
                                break;
                            default:
                                await bot.sendMessage(chatId, `Сталася помилка. Код статусу: ${status}.`);
                        }
                    } else if (e.request) {
                        await bot.sendMessage(chatId, 'Не вдалося отримати відповідь від сервера. Перевірте ваше з’єднання і спробуйте ще раз.');
                    } else {
                        await bot.sendMessage(chatId, `Сталася помилка при налаштуванні запиту: ${e.message}`);
                    }
                } else {
                    await bot.sendMessage(chatId, `Невідома помилка: ${e.message}`);
                }
            }
        })
    } catch (e: any) {
        console.log('Fail at updateBooking', e.message)
        bot.sendMessage(chatId, 'Fail at updateBooking')
    }
}

export { getBookings, createBooking, updateBooking, deleteBooking }