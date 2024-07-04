import { startBot } from "./bot";
import { config } from "./config";
import express, { Express } from "express";

const app: Express = express();
const PORT = process.env.EXPRESS_PORT || 5000;

startBot(config.botToken);


app.get('/', (req, res) => {
    res.send('Admin bot is working');
})

app.listen(PORT, () => {
    console.log('Server for admin bot is working...')
})

console.log('Bot and server initialized successfully');