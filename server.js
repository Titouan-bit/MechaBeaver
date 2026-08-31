const express = require('express');
const cors = require('cors');
const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const BotNum = '33474887869@s.whatsapp.net';

const commands = ["!ChooseName"]
const commandsWithContent = ["!ChooseName"]

const app = express();
app.use(cors());
app.use(express.json());

const fs = require('fs');
const path = './users.json';

function loadUsers() {
    if (!fs.existsSync(path)) return {};
    return JSON.parse(fs.readFileSync(path, 'utf-8'));
}

function saveUsers(users) {
    fs.writeFileSync(path, JSON.stringify(users, null, 2));
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

let sock;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'fatal' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        const botPhoneNumber = "33474887869"; 
        
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(botPhoneNumber);
                console.log(`\n👉 TON CODE D'APPAIRAGE WHATSAPP : ${code}\n`);
            } catch (err) {
                console.error("Pairing code generation error :", err);
            }
        }, 3000);
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log('🤖 Bot WhatsApp connecté et prêt !');
            await sock.sendMessage(BotNum, { text: `🤖 Bot WhatsApp connecté et prêt !` });
        } else if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`Connexion fermée (Code: ${statusCode})`);

            const shouldReconnect = statusCode !== 401;
            if (shouldReconnect) {
                console.log('Tentative de reconnexion...');
                connectToWhatsApp();
            } else {
                console.log('Session corrompue ou révoquée. Supprime le dossier de session et rescanne.');
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];

        if (!message.message || message.key.fromMe) return;

        const senderNumber = message.key.remoteJid;

        const text = message.message.conversation 
            || message.message.extendedTextMessage?.text 
            || '';

        console.log(`Message reçu de ${senderNumber} : ${text}`);

        
        if (text === '!ChooseName') {
            await sleep(3000)
            await sock.sendMessage(senderNumber, { text: `Ok, Good command, you can now write !ChooseName (the name of your choice without special characters just _ allowed) you can change the name after.`});
            const name = text.replace('!ChooseName', '').trim();
            
        } else if (text.startsWith('!ChooseName')) {
            let name = text.replace('!ChooseName', '').trim();
            name = name.replace(/ /g, '_');

            if (!name || /[^a-zA-Z0-9_]/.test(name)) {
                await sleep(3000)
                await sock.sendMessage(senderNumber, { text: `Invalid Name please use only letters, numbers and _`});
                return;
            }

            await sleep(3000)

            const users = loadUsers();
            users[senderNumber] = name;
            saveUsers(users);

            await sock.sendMessage(senderNumber, { text: `Ok, your profile has been saved under the name: ${name}` });
        }
    });
}

connectToWhatsApp();
app.post('/send-code', async (req, res) => {
    const { phoneNumber, code} = req.body;

    if (!phoneNumber || !code) {
        return res.status(400).json({ success: false, message: 'Missing data' });
    }

    if (!sock) {
        return res.status(503).json({ success: false, error: 'WhatsApp connection not ready' });
    }

    const cleanDigits = phoneNumber.replace(/\D/g, ''); 
    const cleanNumber = `${cleanDigits}@s.whatsapp.net`;

    try {
        await sock.sendMessage(cleanNumber, { text: `Here your code MECHHA-BEAVER : ${code}` });
        await sock.sendMessage(BotNum, { text: `Un Nouveau code !` });
        console.log(`Code ${code} envoyé à ${phoneNumber}`);
        res.json({ success: true, message: 'Code sent on WhatsApp !' });
    } catch (err) {
        console.error('Erreur d envoi :', err);
        res.status(500).json({ success: false, error: err.message || 'An error occurred while sending' });
    }
});

app.post('/send-HelloMessage', async (req, res) => {
    const { phoneNumber} = req.body;
    if (!phoneNumber) {
        return res.status(400).json({ success: false, message: 'Missing data' });
    }

    if (!sock) {
        return res.status(503).json({ success: false, error: 'WhatsApp connection not ready' });
    }

    const cleanDigits = phoneNumber.replace(/\D/g, ''); 
    const cleanNumber = `${cleanDigits}@s.whatsapp.net`;
    try {
        await sock.sendMessage(cleanNumber, { text: `Hi thanks to use MechaBeaver ! /nSome Rules for the first time: /n -Never call MechaBeaver you can join support here (+33 6 85 76 66 21) (mechabeaver.support@gmail.com) /n -Don't sapm the bot /n -Put the emoji ✅ in reaction for Don't see that message in the future ! First You need to choose a name for Save your profile with the command !ChooseName` });
        res.json({ success: true, message: 'Success ! You can now awnser to mecha beaver' });
    } catch (err) {
        console.error('Erreur d envoi :', err);
        res.status(500).json({ success: false, error: err.message || 'An error occurred while sending' });
    }
});
app.listen(3000, () => {
    console.log('Serveur lancé sur http://localhost:3000');
});
