const express = require('express');
const cors = require('cors');
const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const BotNum = '33474887869@s.whatsapp.net';

const commands = ["!ChooseName"]
const commandsWithContent = ["!ChooseName"]
const AdminsNumbers = ["33685766621@s.whatsapp.net"]
const FORBIDDEN_NAMES = [
  "admin", "administrator", "administrateur", "mod", "moderator", "moderateur",
  "owner", "fondateur", "founder", "creator", "createur", "createur_bot",
  "staff", "team", "support", "help", "aide", "service", "sys", "system",
  "systeme", "root", "superuser", "master", "boss", "chief", "leader",
  "mechabeaver", "mecha-beaver", "mecha_beaver", "mecha", "beaver",
  "bot", "robot", "ia", "ai", "automaton", "whatsapp", "wa", "official",
  "officiel", "verified", "verifie", "security", "securite", "dev", "developer",
  "developpeur", "webmaster", "tech", "technical",
  "vip", "premium", "pro", "ultra", "gold", "elite", "god", "dieu",
  "king", "queen", "president", "ceo", "co-owner", "head", "manager",
  "supervisor", "superviseur", "assistant", "agent", "rep", "representative",
  "null", "undefined", "none", "anonymous", "anonyme", "unknown", "inconnu",
  "test", "testing", "tester", "demo", "guest", "invite", "user", "utilisateur",
  "member", "membre", "everyone", "here", "all", "tous", "nobody", "personne",
  "help", "cmd", "command", "setting", "settings", "config", "configuration",
  "ban", "kick", "mute", "warn", "rule", "rules", "regle", "regles",
  "status", "statut", "info", "infos", "log", "logs", "api", "database",
  "db", "server", "serveur", "token", "auth", "login", "password",
  "giveaway", "free", "gratuit", "payment", "paiement", "gift", "cadeau",
  "reward", "rewards", "contest", "concours", "win", "winner", "gagnant",
  "verify", "verification", "check", "code", "otp", "billing", "facture"
];
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

        if (message.message.reactionMessage) {
            const emoji = message.message.reactionMessage.text;
            const reactedMessageId = message.message.reactionMessage.key.id;

            const users = loadUsers();
            const userData = users[senderNumber];

            if (userData?.rulesAccepted) return;

            if (emoji === '✅' && userData && reactedMessageId === userData.rulesMessageId) {
                userData.rulesAccepted = true;
                saveUsers(users);

                if (userData.name) {
                    await sock.sendMessage(senderNumber, { text: `Thanks ${userData.name} for have agree the rules !` });
                } else {
                    await sock.sendMessage(senderNumber, { text: `Thanks for have agree the rules` });
                }
            }
            return;
        }

        if (!text.startsWith('!')) return;

        const command = text.split(" ")[0];

        if (!commands.includes(command) && !commandsWithContent.includes(command)) {
            await sleep(3000)
            await sock.sendMessage(senderNumber, { text: `❌ Invalid command list of commands with !commands`})
            return;
        }

        if (text === '!ChooseName') {
            await sleep(3000)
            await sock.sendMessage(senderNumber, { text: `Ok, Good command, you can now write !ChooseName (the name of your choice without special characters just _ allowed) you can change the name after.`});

        } else if (text.startsWith('!ChooseName')) {
            let name = text.replace('!ChooseName', '').trim();
            name = name.replace(/ /g, '_');

            if (FORBIDDEN_NAMES.some(forbidden => name.toLowerCase().includes(forbidden))) {
                if (!AdminsNumbers.includes(senderNumber)) {
                    await sleep(3000)
                    await sock.sendMessage(senderNumber, { text: "❌ This name is forbidden restart the command" });
                    return;
                }
            }

            if (!name || /[^a-zA-Z0-9_]/.test(name)) {
                await sleep(3000)
                await sock.sendMessage(senderNumber, { text: `Invalid Name please use only letters, numbers and _`});
                return;
            }

            await sleep(3000)

            const users = loadUsers();
            users[senderNumber] = {
                ...users[senderNumber],
                name: name
            };
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

    const users = loadUsers();
    const isReturningUser = users.hasOwnProperty(cleanNumber);

    if (!isReturningUser) {
        try {
            const sentMessage = await sock.sendMessage(cleanNumber, { text: `Hi thanks to use MechaBeaver !\nSome Rules for the first time:\n-Never call MechaBeaver you can join support here (+33 6 85 76 66 21) (mechabeaver.support@gmail.com)\n-Don't spam the bot\n-Put the emoji ✅ in reaction for Don't see that message in the future ! First You need to choose a name for Save your profile with the command !ChooseName` });
            users[cleanNumber] = {
                rulesMessageId: sentMessage.key.id,
                rulesAccepted: false,
                name: null
            };
            saveUsers(users);
            res.json({ success: true, message: 'Success ! You can now awnser to mecha beaver' });
        } catch (err) {
            console.error('Erreur d envoi :', err);
            res.status(500).json({ success: false, error: err.message || 'An error occurred while sending' });
        }
    } else {
        const savedName = users[cleanNumber].name;
        await sock.sendMessage(cleanNumber, {text: `Hi Success session loaded ${savedName || ''}` })
        res.json({ success: true, message: 'Session loaded' });
    }
});
app.listen(3000, () => {
    console.log('Serveur lancé sur http://localhost:3000');
});