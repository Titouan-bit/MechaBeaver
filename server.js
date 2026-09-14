const express = require('express');
const cors = require('cors');
const { makeWASocket, initAuthCreds, BufferJSON } = require('@whiskeysockets/baileys');
const pino = require('pino');
const mongoose = require('mongoose');

const uri = "mongodb+srv://cordetitouan_db_user:C4acjgzdyKx79C19@cluster0.0gs17s7.mongodb.net/?appName=Cluster0";

mongoose.connect(uri)
  .then(() => console.log('🍃 Connecté à MongoDB avec succès !'))
  .catch((err) => console.error('❌ Erreur de connexion MongoDB :', err));

const authSchema = new mongoose.Schema({
    _id: String,
    data: String
}, { collection: 'whatsapp_session' });

const AuthModel = mongoose.model('AuthSession', authSchema);

const dataSchema = new mongoose.Schema({
    _id: String,
    data: mongoose.Schema.Types.Mixed
}, { collection: 'bot_data' });

const DataModel = mongoose.model('BotData', dataSchema);

async function loadData(id) {
    try {
        const doc = await DataModel.findById(id);
        return doc ? doc.data : {};
    } catch (e) {
        console.error(`Erreur lecture ${id} MongoDB:`, e);
        return {};
    }
}

async function saveData(id, value) {
    try {
        await DataModel.findByIdAndUpdate(
            id,
            { data: value },
            { upsert: true }
        );
    } catch (e) {
        console.error(`Erreur écriture ${id} MongoDB:`, e);
    }
}

// Gestion d'état Baileys 100% compatible MongoDB
async function useMongoDBAuthState() {
    const writeData = async (data, id) => {
        try {
            await AuthModel.findByIdAndUpdate(
                id, 
                { data: JSON.stringify(data, BufferJSON.replacer) },
                { upsert: true, returnDocument: 'after' }
            );
        } catch (e) {
            console.error('Erreur écriture session MongoDB:', e);
        }
    };

    const readData = async (id) => {
        try {
            const doc = await AuthModel.findById(id);
            if (!doc || !doc.data) return null;
            return JSON.parse(doc.data, BufferJSON.reviver);
        } catch (e) {
            console.error('Erreur lecture session MongoDB:', e);
            return null;
        }
    };

    const removeData = async (id) => {
        try {
            await AuthModel.findByIdAndDelete(id);
        } catch (e) {
            console.error('Erreur suppression session MongoDB:', e);
        }
    };

    const creds = await readData('creds') || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = makeWASocket.proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(value, key));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: async () => {
            await writeData(creds, 'creds');
        }
    };
}

const refusalReplies = [
    "No.",
    "Noooon 🤫",
    "Don't give me orders 🗿",
    "Who do you think you're talking to? 🤡",
    "I'm not your slave, cope 🥱"
];

const jokes = [
    "Why don't scientists trust atoms? Because they make up everything! ⚛️",
    "I told my doctor that I broke my arm in two places. He told me to stop going to those places 🏥",
    "Why do we tell actors to 'break a leg'? Because every play has a cast 🎭",
    "What do you call a fake noodle? An impasta 🍝",
    "Why don't eggs tell jokes? They'd crack each other up 🥚",
    "My wife told me to stop impersonating a flamingo. I had to put my foot down 🦩"
];

const formatGuildText = async function(guildId, guildsData) {
    const users = await loadUsers();
    const g = guildsData[guildId];

    if (!g) return null;

    const leaderName = g.leader || "";
    const description = g.description || "no description";
    const leaderCoins = users[leaderName]?.coins || 0;
    const totalCoins = (g.guildcoins || 0) + leaderCoins;
    const formattedDate = new Date(g.DateCreate).toLocaleDateString('fr-FR');
    const leaderMention = leaderName.split('@')[0];

    const guildText = 
        `👑 Leader : @${leaderMention}\n` +
        "```\n" +
        `🏰 Guild : ${g.name}\n` +
        `📅 Create : ${formattedDate}\n` +
        `Description: ${description}\n` +
        "─────────────────────────────\n" +
        `👥 Members : ${g.memberCount || 1}/${g.maxMembers || 31}\n` +
        `⭐ Level : ${g.guildLevel || 1}\n` +
        `🏆 Rank : #${g.guildRank || 0}\n` +
        `🪙 coins: ${totalCoins}\n` +
        "─────────────────────────────\n" +
        "🔮 GUILD BUFFS\n" +
        `• XP Boost : +${g.buffs?.xpBoost || 0}%\n` +
        `• Coin Bonus : +${g.buffs?.coinBonus || 0}%\n` +
        "─────────────────────────────\n" +
        "⚔️ WAR STATS\n" +
        `• Victories : ${g.stats?.warsWon || 0}\n` +
        `• Defeats : ${g.stats?.warsLost || 0}\n` +
        "```";

    return { text: guildText, leaderJid: leaderName };
};

const BotNum = '33474887869@s.whatsapp.net';
const SupremAdminNum = '33685766621@s.whatsapp.net';

const AUTO_DELETE_MS = 60000;

async function loadGroups() {
    return loadData('groups');
}

async function saveGroups(groups) {
    return saveData('groups', groups);
}

async function loadGuilds() {
    return loadData('guilds');
}

async function saveGuilds(guildsData) {
    return saveData('guilds', guildsData);
}

async function loadUsers() {
    return loadData('users');
}

async function saveUsers(users) {
    return saveData('users', users);
}

async function isGroupAdmin(groupJid, participantJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid);
        const participant = metadata.participants.find(p => p.id === participantJid);
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';
    } catch (e) {
        return false;
    }
}

const commands = ["!ChooseName", "!changeName", "!commands", "!contact", "!forbiddenwords", "!rules", "!test", "!shifumi", "!joke", "!profile", "!guilds", "!steal"];
const commandsWithContent = ["!ChooseName", "!changeName", "!steal", "!CreateGuild", "!give", "!description", "!guild", "!join"];
const AdminCommandsWithContent = ["!ban", "!unban", "!mute", "!unmute", "!warn"];
const AdminCommands = ["!setrules", "!config-automute", "!config-autowarn", "!delete-auto", "!config-autoban", "!welcome"];

const AdminsNumbers = ["33685766621@s.whatsapp.net", "124893974814925@lid"];
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

function sleep(ms) { 
    return new Promise(resolve => setTimeout(resolve, ms)); 
}

function resolveJid(rawArg) {
    if (!rawArg) return null;
    const cleanArg = rawArg.trim();
    if (cleanArg.includes('@')) {
        return cleanArg;
    }
    const digits = cleanArg.replace(/\D/g, '');
    if (!digits) return null;
    return `${digits}@s.whatsapp.net`;
}

function extractJid(participant) {
    if (!participant) return null;
    if (typeof participant === 'string') return participant;
    return participant.id || participant.jid || participant.phoneNumber || null;
}

function jidMatchesNumber(jid, cleanNum, users) {
    if (!jid || !cleanNum) return false;
    if (jid.split('@')[0] === cleanNum) return true;
    const linked = users?.[jid]?.linkedTo;
    if (linked && linked.split('@')[0] === cleanNum) return true;
    return false;
}

function resolveAccountJid(users, jid) {
    if (!jid) return jid;
    const direct = users[jid];
    const linkedJid = direct?.linkedTo;
    const linked = linkedJid ? users[linkedJid] : null;

    if (direct?.name) return jid;
    if (linked?.name) return linkedJid;
    return jid;
}

let sock;

function scheduleAutoDelete(jid, key, delay = AUTO_DELETE_MS) {
    if (!jid || !key) return;
    if (!jid.endsWith('@g.us')) return;
    setTimeout(async () => {
        try {
            await sock.sendMessage(jid, { delete: key });
        } catch (e) {}
    }, delay);
}

async function sendMessageAutoDelete(jid, content, options, delay = AUTO_DELETE_MS) {
    const sent = await sock.sendMessage(jid, content, options);
    if (sent) scheduleAutoDelete(jid, sent.key, delay);
    return sent;
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMongoDBAuthState();

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'fatal' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    async function checkExpiredBans() {
        const users = await loadUsers();
        let changed = false;

        for (const jid in users) {
            const userData = users[jid];
            if (userData.bannedUntil && Date.now() >= userData.bannedUntil) {
                try {
                    await sock.updateBlockStatus(jid, 'unblock');
                } catch (e) {}
                userData.bannedUntil = null;
                userData.warns = 0;
                changed = true;

                try {
                    await sendMessageAutoDelete(jid, { text: `✅ You are unbanned, welcome back !` });
                } catch (e) {}
            }
        }

        if (changed) await saveUsers(users);
    }

    setInterval(checkExpiredBans, 60 * 60 * 1000);

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
            try {
                await sendMessageAutoDelete(BotNum, { text: `🤖 Bot WhatsApp connecté et prêt !` });
            } catch (e) {}
        } else if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`Connexion fermée (Code: ${statusCode})`);

            const shouldReconnect = statusCode !== 401;
            if (shouldReconnect) {
                console.log('Tentative de reconnexion...');
                connectToWhatsApp();
            } else {
                console.log('Session révoquée. Nettoyage et reconnexion...');
                await AuthModel.deleteMany({});
                connectToWhatsApp();
            }
        }
    });

    sock.ev.on('call', async (calls) => {
        for (const call of calls) {
            if (call.status === 'offer') {
                console.log(`Appel WhatsApp reçu de ${call.from}`);
                try {
                    await sock.rejectCall(call.id, call.from);
                } catch (e) {}

                const users = await loadUsers();
                let userData = users[call.from] || { rulesAccepted: false, name: null, warns: 0 };

                userData.warns = (userData.warns || 0) + 1;
                users[call.from] = userData;
                await saveUsers(users);

                await sleep(3000);
                if (userData.warns >= 3) {
                    userData.bannedUntil = Date.now() + (30 * 24 * 60 * 60 * 1000);
                    users[call.from] = userData;
                    await saveUsers(users);

                    await sendMessageAutoDelete(call.from, { text: `Congrats ! You reached 3 warns and got ban for 30 days. You will receive a message when you will be unban` });
                    try {
                        await sock.updateBlockStatus(call.from, 'block');
                    } catch (e) {}
                    await sleep(3000);
                    await sendMessageAutoDelete(SupremAdminNum, { text: `❌ ${call.from} a été ban 30 jours` });
                } else {
                    await sendMessageAutoDelete(call.from, { text: `❌ Calls are automaticaly refused ! You take a warn. 3 warns -> ban 30 days of the bot` });
                    await sleep(3000);
                    await sendMessageAutoDelete(SupremAdminNum, { text: `❌ ${call.from} a essayé d'appeler il a recu un avertissement` });
                }
            }
        }
    });

    sock.ev.on('group-participants.update', async (update) => {
        try {
            if (update.action !== 'add') return;

            const groups = await loadGroups();
            let groupData = groups[update.id] || {};

            if (!groupData.welcomeMessage) return;

            for (const participant of update.participants) {
                const newUserJid = extractJid(participant);
                if (!newUserJid) continue;

                const mention = `@${newUserJid.split('@')[0]}`;
                const finalText = groupData.welcomeMessage.replace(/NewUser/g, mention);

                await sendMessageAutoDelete(update.id, { text: finalText, mentions: [newUserJid] });
            }
        } catch (e) {
            console.error('Erreur welcome message :', e);
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];

        if (!message.message) return;
        if (message.key.fromMe && !message.message.reactionMessage) return;

        const senderNumber = message.key.remoteJid;
        const senderNumberAlt = message.key.remoteJidAlt || null;
        const users = await loadUsers();
        const userData = users[senderNumber];
        const rulesAccepted = userData?.rulesAccepted === true;

        const text = message.message.conversation
            || message.message.extendedTextMessage?.text
            || '';

        if (text.startsWith('!')) {
            scheduleAutoDelete(senderNumber, message.key);
        }

        const isGroupMessage = senderNumber.endsWith('@g.us');

        let groups = null;
        let groupData = null;
        const participantJid = message.key.participant;
        const participantAlt = message.key.participantAlt || null;

        if (isGroupMessage) {
            groups = await loadGroups();
            groupData = groups[senderNumber] || { rules: null, waitingForRules: null, waitingForConfig: null };
            try {
                const metadata = await sock.groupMetadata(senderNumber);
                const isMember = metadata.participants.some(p => p.id === participantJid);

                if (!isMember) {
                    await sleep(1000);
                    await sendMessageAutoDelete(senderNumber, { text: `❌ This user is not in this group !` });
                    return;
                }
            } catch (e) {
                console.error('Erreur vérification membres du groupe :', e);
            }
        }

        const nope = async function () {
            if (Math.random() < 0.10) {
                const randomRefusal = refusalReplies[Math.floor(Math.random() * refusalReplies.length)];

                if (isGroupMessage && groupData && participantJid) {
                    if (!groupData.muted) groupData.muted = {};
                    groupData.muted[participantJid] = Date.now() + (30 * 1000);
                    groups[senderNumber] = groupData;
                    await saveGroups(groups);

                    await sleep(1000);
                    await sendMessageAutoDelete(senderNumber, { text: `${randomRefusal}\n\n🔇 @${participantJid.split('@')[0]} tried to order me around. Muted 30s.`, mentions: [participantJid] });
                } else {
                    await sleep(1000);
                    await sendMessageAutoDelete(senderNumber, { text: randomRefusal });
                }
                return true;
            }
            return false;
        };

        const steal = async function (targetJid) {
            const users = await loadUsers();

            targetJid = resolveAccountJid(users, targetJid);

            if (!users[participantJid]) users[participantJid] = {};
            if (!users[targetJid]) users[targetJid] = {};

            if ((users[targetJid].coins || 0) < 30) {
                await sleep(1000);
                await sendMessageAutoDelete(senderNumber, { text: `@${targetJid.split('@')[0]} is broke ahah 🤡`, mentions: [targetJid] });
                return;
            }

            if (Math.random() < 0.50) {
                users[participantJid].coins = (users[participantJid].coins || 0) + 30;
                users[targetJid].coins = Math.max(0, (users[targetJid].coins || 0) - 30);
                users[participantJid].stealswons = (users[participantJid].stealswons || 0) + 1;
                users[participantJid].steals = (users[participantJid].steals || 0) + 1;
                await saveUsers(users);

                await sleep(1000);
                await sendMessageAutoDelete(senderNumber, { 
                    text: `@${participantJid.split('@')[0]} stole 30 gold from @${targetJid.split('@')[0]}! 💰`, 
                    mentions: [participantJid, targetJid] 
                });
            } else {
                users[participantJid].coins = Math.max(0, (users[participantJid].coins || 0) - 5);
                users[participantJid].steals = (users[participantJid].steals || 0) + 1;
                await saveUsers(users);

                await sleep(1000);
                await sendMessageAutoDelete(senderNumber, { 
                    text: `@${participantJid.split('@')[0]} 💰 was caught red-handed and lost 5 gold! 🤡`,
                    mentions: [participantJid]
                });
            }
        };

        console.log(`Message reçu de ${senderNumber} : ${text}`);

        if (senderNumberAlt) {
            const users = await loadUsers();
            if (!users[senderNumberAlt] || users[senderNumberAlt].linkedTo !== senderNumber) {
                users[senderNumberAlt] = { ...users[senderNumberAlt], linkedTo: senderNumber };
                await saveUsers(users);
            }
        }

        if (isGroupMessage && participantAlt && participantJid) {
            const users = await loadUsers();
            let changed = false;

            if (!users[participantAlt] || users[participantAlt].linkedTo !== participantJid) {
                users[participantAlt] = { ...users[participantAlt], linkedTo: participantJid };
                changed = true;
            }
            if (!users[participantJid] || users[participantJid].linkedTo !== participantAlt) {
                users[participantJid] = { ...users[participantJid], linkedTo: participantAlt };
                changed = true;
            }

            if (changed) await saveUsers(users);
        }

        if (message.message.reactionMessage) {
            const emoji = message.message.reactionMessage.text;
            const users = await loadUsers();
            let userData = users[senderNumber] || { rulesAccepted: false, name: null };

            if (userData.rulesAccepted) return;

            if (emoji === '✅') {
                userData.rulesAccepted = true;
                users[senderNumber] = userData;
                await saveUsers(users);
                await sleep(3000);
                await sendMessageAutoDelete(senderNumber, { text: `✅ Thanks for agreeing to the rules! You can now use commands.` });
            }
            return;
        }

        if (isGroupMessage) {
            const Admin = await isGroupAdmin(senderNumber, participantJid);
            const usersForAccount = await loadUsers();
            const memberData = usersForAccount[participantJid];
            const hasAccount = memberData && memberData.name;

            if (text.startsWith('!') && !hasAccount && !text.startsWith('!ChooseName')) {
                await sleep(1000);
                await sendMessageAutoDelete(senderNumber, {
                    text: `❌ @${participantJid.split('@')[0]}, you must create an account first with !ChooseName in DM`,
                    mentions: [participantJid]
                }, { quoted: message });
                return;
            }

            if (groupData.muted && groupData.muted[participantJid]) {
                if (Date.now() < groupData.muted[participantJid]) {
                    try {
                        await sock.sendMessage(senderNumber, { delete: message.key });
                    } catch (err) {}
                    return;
                } else {
                    delete groupData.muted[participantJid];
                    groups[senderNumber] = groupData;
                    await saveGroups(groups);
                }
            }

            const lowerText = text.toLowerCase();
            const categories = ['ban', 'mute', 'warn'];
            let matchedCategory = null;

            for (const category of categories) {
                const words = groupData[category] || [];
                if (words.some(word => word && lowerText.includes(word))) {
                    matchedCategory = category;
                    break;
                }
            }

            if (matchedCategory) {
                try {
                    await sock.sendMessage(senderNumber, { delete: message.key });
                } catch (err) {}

                if (matchedCategory === 'mute') {
                    if (!groupData.muted) groupData.muted = {};
                    groupData.muted[participantJid] = Date.now() + (15 * 60 * 1000);
                    groups[senderNumber] = groupData;
                    await saveGroups(groups);

                    await sendMessageAutoDelete(senderNumber, { text: `🔇 @${participantJid.split('@')[0]} was muted 15min (forbidden word).`, mentions: [participantJid] });

                } else if (matchedCategory === 'warn') {
                    const users = await loadUsers();
                    let userData = users[participantJid] || { rulesAccepted: false, name: null, warns: 0 };
                    userData.warns = (userData.warns || 0) + 1;

                    if (userData.warns >= 3) {
                        userData.bannedUntil = Date.now() + (30 * 24 * 60 * 60 * 1000);
                        userData.warns = 0;
                        users[participantJid] = userData;
                        await saveUsers(users);

                        try {
                            await sock.groupParticipantsUpdate(senderNumber, [participantJid], 'remove');
                        } catch (e) {}
                        await sendMessageAutoDelete(senderNumber, { text: `❌ @${participantJid.split('@')[0]} has 3 warns -> banned 30 days.`, mentions: [participantJid] });
                    } else {
                        users[participantJid] = userData;
                        await saveUsers(users);
                        await sendMessageAutoDelete(senderNumber, { text: `⚠️ @${participantJid.split('@')[0]} warned (${userData.warns}/3, forbidden word).`, mentions: [participantJid] });
                    }

                } else if (matchedCategory === 'ban') {
                    const users = await loadUsers();
                    let userData = users[participantJid] || { rulesAccepted: false, name: null, warns: 0 };
                    userData.bannedUntil = Date.now() + (30 * 24 * 60 * 60 * 1000);
                    users[participantJid] = userData;
                    await saveUsers(users);

                    try {
                        await sock.groupParticipantsUpdate(senderNumber, [participantJid], 'remove');
                    } catch (e) {}
                    await sendMessageAutoDelete(senderNumber, { text: `❌ @${participantJid.split('@')[0]} was banned (forbidden word).`, mentions: [participantJid] });
                }

                return;
            }

            if (text === '!test') {
                await sleep(1000);
                await nope();
                return;
            }

            if (text === '!setrules') {
                if (!Admin) {
                    await sleep(3000);
                    await sendMessageAutoDelete(senderNumber, { text: `❌ You think you can do that ? no no no 🤡` });
                    return;
                }

                if (await nope()) return;

                groupData.waitingForRules = { admin: participantJid, expiresAt: Date.now() + 3 * 60 * 1000 };
                groups[senderNumber] = groupData;
                await saveGroups(groups);

                await sleep(3000);
                await sendMessageAutoDelete(senderNumber, { text: `✅ You can now send a message starting with "Rules:"` });
                return;
            }

            if (groupData.waitingForRules
                && groupData.waitingForRules.admin === participantJid
                && Date.now() < groupData.waitingForRules.expiresAt
                && (text.startsWith('Rules:') || text.startsWith('rules:'))) {

                if (await nope()) return;

                groupData.rules = text;
                groupData.waitingForRules = null;
                groups[senderNumber] = groupData;
                await saveGroups(groups);

                await sleep(3000);
                await sendMessageAutoDelete(senderNumber, { text: `✅ Rules updated for this group ! Everyone can see them with !rules` });
                return;
            }

            if (text === '!rules') {
                if (!groupData.rules) {
                    await sleep(3000);
                    await sendMessageAutoDelete(senderNumber, { text: `❌ Make rules before with !setrules` });
                } else {
                    if (await nope()) return;
                    await sleep(3000);
                    await sendMessageAutoDelete(senderNumber, { text: `${groupData.rules}` });
                }
                return;
            }

            if (text === "!commands") {
                if (!Admin) {
                    await sleep(2000);
                    await sendMessageAutoDelete(senderNumber, { text: `✅ Commands list:\n- !ChooseName (name)\n- !changeName (name)\n- !contact\n- !rules\n- !shifumi\n- !joke\n- !profile\n- !profile @(person)\n- !steal @(person)\n- !guilds\n- !guild (guildname)\n- !join (guildname)\n- !commands\n- !forbiddenwords` });
                    return;
                } else {
                    await sleep(2000);
                    await sendMessageAutoDelete(senderNumber, { text: `✅ Commands list:\n- !ChooseName (name)\n- !changeName (name)\n- !contact\n- !rules\n- !shifumi\n- !joke\n- !profile\n- !profile @(person)\n- !steal @(person)\n- !guilds\n- !guild (guildname)\n- !join (guildname)\n- !commands\n- !forbiddenwords \n- !ban @(person) \n- !unban @(person)\n- !mute @(person)\n- !unmute @(person)\n- !warn @(person)\n- !setrules\n- !config-automute\n- !config-autowarn"\n- !delete-auto\n- !config-autoban\n- !welcome` });
                    return;
                }
            }

            if (text === "!commandfunctions") {
                if (!Admin) {
                    await sleep(2000);
                    await sendMessageAutoDelete(senderNumber, { text: `✅ Commands list:\n- !ChooseName (name): You can choose the beaver name you want.\n- !changeName (name): you can update your beaver name\n- !contact : will give you a phone number and an email adress\n- !rules : see the rules of the group\n- !shifumi: play with me, but you will loose 🤡\n- !joke : will generate a hilarous joke\n- !profile : see your profile\n- !profile @(person) : see the profil of a group mate \n- !steal @(person) : try to steal 30 🪙 from the person mentionned\n- !guilds : see the guilds \n- !guild (guildname) : see the real profil of the guild mentionned\n- !join (guildname) : join the guild\n- !commands : see the commands\n- !forbiddenwords : see the forbidden words of the group and the sanctions` });
                    return;
                } else {
                    await sleep(2000);
                    await sendMessageAutoDelete(senderNumber, { text: `✅ Commands list:\n- !ChooseName (name): You can choose the beaver name you want.\n- !changeName (name): you can update your beaver name\n- !contact : will give you a phone number and an email adress\n- !rules : see the rules of the group\n- !shifumi: play with me, but you will loose 🤡\n- !joke : will generate a hilarous joke\n- !profile : see your profile\n- !profile @(person) : see the profil of a group mate \n- !steal @(person) : try to steal 30 🪙 from the person mentionned\n- !guilds : see the guilds \n- !guild (guildname) : see the real profil of the guild mentionned\n- !join (guildname) : join the guild\n- !commands : see the commands\n- !forbiddenwords : see the forbidden words of the group and the sanctions \n- !ban @(person) : ban the person\n- !unban @(person) : unban the person\n- !mute @(person) : mute that person\n- !unmute @(person) : unmute him\n- !warn @(person) : send a warn to that person\n- !setrules : set the rules of the group\n- !rules : see the rules of the group\n-  !config-automute : config words sho auto-mute the persons\n- !config-autowarn : config words sho auto-warn the persons\n- !delete-auto : delete the auto function of your choice\n- !config-autoban : config words sho auto-ban the persons\n- !welcome : config the welcome message when a person join the group` });
                    return;
                }
            }

            if (text === '!config-automute' || text === '!config-autoban' || text === '!config-autowarn') {
                if (!Admin) {
                    await sleep(3000);
                    await sendMessageAutoDelete(senderNumber, { text: `❌ You think you can do that ? no no no 🤡` });
                    return;
                }

                if (await nope()) return;
                const type = text.replace('!config-auto', '');

                groupData.waitingForConfig = { admin: participantJid, expiresAt: Date.now() + 3 * 60 * 1000, type: type };
                groups[senderNumber] = groupData;
                await saveGroups(groups);

                await sleep(3000);
                await sendMessageAutoDelete(senderNumber, { text: `✅ Send the list with Words: (word, word, emoji, etc...)` });
                return;
            }

            if (groupData.waitingForConfig
                && groupData.waitingForConfig.admin === participantJid
                && Date.now() < groupData.waitingForConfig.expiresAt
                && (text.startsWith('Words:') || text.startsWith('words:'))) {

                if (await nope()) return;

                const rawList = text.replace(/^Words:/i, '');
                const words = rawList.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
                const type = groupData.waitingForConfig.type;

                if (!groupData[type]) groupData[type] = [];
                for (const word of words) {
                    if (!groupData[type].includes(word)) groupData[type].push(word);
                }

                groupData.waitingForConfig = null;
                groups[senderNumber] = groupData;
                await saveGroups(groups);

                await sleep(3000);
                await sendMessageAutoDelete(senderNumber, { text: `✅ Added to auto-${type} list: ${words.join(', ')}` });
                return;
            }

            if (text.startsWith('!ban ') || text.startsWith('!unban ')
                || text.startsWith('!mute ') || text.startsWith('!unmute ')
                || text.startsWith('!warn ')) {

                if (!Admin) {
                    await sleep(3000);
                    await sendMessageAutoDelete(senderNumber, { text: `❌ You think you can do that ? no no no 🤡` });
                    return;
                }

                const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
                const [cmd, arg] = text.split(' ');
                const targetJid = mentionedJid || resolveJid(arg);

                if (!targetJid) {
                    await sleep(3000);
                    await sendMessageAutoDelete(senderNumber, { text: `❌ Mention someone (@) or provide a valid phone number ex: ${cmd} 33612345678` });
                    return;
                }

                if (await nope()) return;

                if (cmd === '!ban') {
                    const users = await loadUsers();
                    let userData = users[targetJid] || { rulesAccepted: false, name: null, warns: 0 };
                    userData.bannedUntil = Date.now() + (30 * 24 * 60 * 60 * 1000);
                    users[targetJid] = userData;
                    await saveUsers(users);

                    try {
                        await sock.groupParticipantsUpdate(senderNumber, [targetJid], 'remove');
                    } catch (e) {}

                    await sleep(2000);
                    await sendMessageAutoDelete(senderNumber, { text: `❌ @${targetJid.split('@')[0]} was banned 30 days by an admin.`, mentions: [targetJid] });
                } else if (cmd === '!unban') {
                    const users = await loadUsers();
                    if (users[targetJid]) {
                        users[targetJid].bannedUntil = null;
                        users[targetJid].warns = 0;
                        await saveUsers(users);
                    }

                    try {
                        await sock.groupParticipantsUpdate(senderNumber, [targetJid], 'add');
                    } catch (e) {}

                    await sleep(3000);
                    await sendMessageAutoDelete(senderNumber, { text: `✅ @${targetJid.split('@')[0]} was added back to group by an admin.`, mentions: [targetJid] });

                } else if (cmd === '!mute') {
                    if (!groupData.muted) groupData.muted = {};
                    groupData.muted[targetJid] = Date.now() + 15 * 60 * 1000;
                    groups[senderNumber] = groupData;
                    await saveGroups(groups);
                    await sleep(3000);
                    await sendMessageAutoDelete(senderNumber, { text: `🔇 @${targetJid.split('@')[0]} was muted 15min by an admin.`, mentions: [targetJid] });

                } else if (cmd === '!unmute') {
                    if (groupData.muted && groupData.muted[targetJid]) {
                        delete groupData.muted[targetJid];
                        groups[senderNumber] = groupData;
                        await saveGroups(groups);
                    }
                    await sleep(3000);
                    await sendMessageAutoDelete(senderNumber, { text: `🔊 @${targetJid.split('@')[0]} was unmuted by an admin.`, mentions: [targetJid] });

                } else if (cmd === '!warn') {
                    const users = await loadUsers();
                    let userData = users[targetJid] || { rulesAccepted: false, name: null, warns: 0 };
                    userData.warns = (userData.warns || 0) + 1;

                    if (userData.warns >= 3) {
                        userData.bannedUntil = Date.now() + (30 * 24 * 60 * 60 * 1000);
                        userData.warns = 0;
                        users[targetJid] = userData;
                        await saveUsers(users);

                        try {
                            await sock.groupParticipantsUpdate(senderNumber, [targetJid], 'remove');
                        } catch (e) {}

                        await sendMessageAutoDelete(senderNumber, { text: `❌ @${targetJid.split('@')[0]} has 3 warns -> banned 30 days.`, mentions: [targetJid] });
                    } else {
                        users[participantJid] = userData;
                        await saveUsers(users);
                        await sendMessageAutoDelete(senderNumber, { text: `⚠️ @${targetJid.split('@')[0]} warned (${userData.warns}/3) by an admin.`, mentions: [targetJid] });
                    }
                }
                return;
            }

            if (text === '!forbiddenwords') {
                const categories = ['ban', 'mute', 'warn'];
                let lines = [];

                for (const category of categories) {
                    const words = groupData[category] || [];
                    for (const word of words) {
                        lines.push(`${word} -> ${category}`);
                    }
                }

                await sleep(3000);
                if (lines.length === 0) {
                    await sendMessageAutoDelete(senderNumber, { text: `❌ No forbidden words configured yet` });
                } else {
                    if (await nope()) return;
                    await sendMessageAutoDelete(senderNumber, { text: `Forbidden words:\n${lines.join('\n')}` });
                }
                return;
            }

            if (text === "!shifumi") {
                if (await nope()) return;

                const choices = ['🪨', '🌿', '✂️'];
                const botChoice = choices[Math.floor(Math.random() * choices.length)];

                if (!groupData.waitingForShifumi) groupData.waitingForShifumi = {};
                groupData.waitingForShifumi[participantJid] = {
                    botChoice: botChoice,
                    expiresAt: Date.now() + 30 * 1000
                };
                groups[senderNumber] = groupData;
                await saveGroups(groups);

                await sleep(1000);
                await sendMessageAutoDelete(senderNumber, { text: `I made my choice now choose 🪨, ✂️ or 🌿 within 30sec or be mute 30sec 🤡` });
                return;
            }

            const shifumiGame = groupData.waitingForShifumi && groupData.waitingForShifumi[participantJid];

            if (shifumiGame && Date.now() < shifumiGame.expiresAt) {
                const playerChoice = text.trim();

                if (['🪨', '🌿', '✂️'].includes(playerChoice)) {
                    const botChoice = shifumiGame.botChoice;
                    delete groupData.waitingForShifumi[participantJid];
                    groups[senderNumber] = groupData;
                    await saveGroups(groups);

                    const users = await loadUsers();
                    if (!users[participantJid]) users[participantJid] = {};

                    users[participantJid].shifumis = (users[participantJid].shifumis || 0) + 1;
                    await saveUsers(users);

                    await sleep(1500);
                    const isLoose = (botChoice === '🪨' && playerChoice === '✂️') || (botChoice === '✂️' && playerChoice === '🌿') || (botChoice === '🌿' && playerChoice === '🪨');
                    const isEqual = botChoice === playerChoice;
                    const isWin = (botChoice === '🌿' && playerChoice === '✂️') || (botChoice === '✂️' && playerChoice === '🪨') || (botChoice === '🪨' && playerChoice === '🌿');

                    if (isLoose) {
                        await sleep(1000);
                        await sendMessageAutoDelete(senderNumber, { text: `${playerChoice} looses against ${botChoice} 🤡 muted 30sec`, mentions: [participantJid] });

                        if (!groupData.muted) groupData.muted = {};
                        groupData.muted[participantJid] = Date.now() + (30 * 1000);
                        groups[senderNumber] = groupData;
                        await saveGroups(groups);
                    } else if (isEqual) {
                        await sleep(1000);
                        await sendMessageAutoDelete(senderNumber, { text: `${playerChoice} and ${botChoice} are same you are lucky` });
                    } else if (isWin) {
                        users[participantJid].coins = (users[participantJid].coins || 0) + 20;
                        users[participantJid].shifumiswons = (users[participantJid].shifumiswons || 0) + 1;
                        await saveUsers(users);
                        await sleep(1000);
                        await sendMessageAutoDelete(senderNumber, { text: `${playerChoice} wins against ${botChoice}! You earned 20 coins 😭` });
                    }
                }
                return;
            }

            if (text === '!joke') {
                if (await nope()) return;

                const joke = jokes[Math.floor(Math.random() * jokes.length)];
                await sleep(2000);
                await sendMessageAutoDelete(senderNumber, { text: joke });
                return;
            }
        }

        if (text === "!description") {
            if (await nope()) return;

            const guilds = await loadGuilds();
            const playerJid = isGroupMessage ? participantJid : senderNumber;
            const playerGuildEntry = Object.entries(guilds).find(([_, g]) => g.leader === playerJid);

            if (!playerGuildEntry) {
                await sendMessageAutoDelete(senderNumber, { text: "❌ You need to have your guild for change description" });
                return;
            }

            const waitingData = { 
                admin: playerJid, 
                guildId: playerGuildEntry[0],
                expiresAt: Date.now() + 3 * 60 * 1000 
            };

            if (isGroupMessage) {
                groupData.waitingForDescription = waitingData;
                groups[senderNumber] = groupData;
                await saveGroups(groups);
            } else {
                const users = await loadUsers();
                if (!users[senderNumber]) users[senderNumber] = {};
                users[senderNumber].waitingForDescription = waitingData;
                await saveUsers(users);
            }

            await sendMessageAutoDelete(senderNumber, { text: `✅ Send the description starting with "description:" within 3min` });
            return;
        }

        const activePlayerJid = isGroupMessage ? participantJid : senderNumber;
        const waitingState = isGroupMessage 
            ? groupData?.waitingForDescription 
            : (await loadUsers())[senderNumber]?.waitingForDescription;

        if (waitingState && waitingState.admin === activePlayerJid && Date.now() < waitingState.expiresAt) {

            if (text.toLowerCase().startsWith('description:')) {
                if (await nope()) return;

                const rawText = text.substring(text.indexOf(':') + 1).trim();

                if (!rawText) {
                    await sendMessageAutoDelete(senderNumber, { text: "❌ Can't have a null description" });
                    return;
                }

                const guilds = await loadGuilds();
                const targetGuildId = waitingState.guildId;

                if (guilds[targetGuildId]) {
                    guilds[targetGuildId].description = rawText;
                    await saveGuilds(guilds);
                }

                if (isGroupMessage) {
                    groupData.waitingForDescription = null;
                    groups[senderNumber] = groupData;
                    await saveGroups(groups);
                } else {
                    const users = await loadUsers();
                    if (users[senderNumber]) {
                        delete users[senderNumber].waitingForDescription;
                        await saveUsers(users);
                    }
                }

                await sendMessageAutoDelete(senderNumber, { text: `✅ Description updated successfully!` });
                return;
            }
        }

        const guildSwitchState = isGroupMessage
            ? groupData?.waitingForGuildSwitch
            : (await loadUsers())[senderNumber]?.waitingForGuildSwitch;

        if (guildSwitchState && guildSwitchState.admin === activePlayerJid && Date.now() < guildSwitchState.expiresAt) {
            const upperText = text.trim().toUpperCase();

            const clearGuildSwitchState = async function () {
                if (isGroupMessage) {
                    groupData.waitingForGuildSwitch = null;
                    groups[senderNumber] = groupData;
                    await saveGroups(groups);
                } else {
                    const users = await loadUsers();
                    if (users[senderNumber]) {
                        delete users[senderNumber].waitingForGuildSwitch;
                        await saveUsers(users);
                    }
                }
            };

            if (upperText.startsWith('N')) {
                await clearGuildSwitchState();
                await sendMessageAutoDelete(senderNumber, { text: `✅ Ok, you stay in your guild.` });
                return;
            }

            if (upperText.startsWith('Y')) {
                const guilds = await loadGuilds();
                const fromGuild = guilds[guildSwitchState.fromGuildId];
                const toGuild = guilds[guildSwitchState.toGuildId];

                if (!fromGuild || !toGuild) {
                    await clearGuildSwitchState();
                    await sendMessageAutoDelete(senderNumber, { text: `❌ One of the guilds no longer exists.` });
                    return;
                }

                if (guildSwitchState.isLeader) {
                    const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
                    const newLeaderJid = mentionedJid || resolveJid(text.replace(/^Y/i, '').trim());

                    if (!newLeaderJid || !fromGuild.members?.includes(newLeaderJid) || newLeaderJid === activePlayerJid) {
                        await sendMessageAutoDelete(senderNumber, { text: `❌ Mention a valid member of your guild to take over as leader.` });
                        return;
                    }

                    fromGuild.leader = newLeaderJid;
                }

                fromGuild.members = (fromGuild.members || []).filter(m => m !== activePlayerJid);
                fromGuild.memberCount = fromGuild.members.length;

                if (!toGuild.members) toGuild.members = [];
                toGuild.members.push(activePlayerJid);
                toGuild.memberCount = toGuild.members.length;

                await saveGuilds(guilds);
                await clearGuildSwitchState();

                await sendMessageAutoDelete(senderNumber, { text: `✅ You left your guild and joined ${toGuild.name} !`, mentions: [activePlayerJid] });
                return;
            }
        }

        if (!text.startsWith('!')) return;

        const command = text.split(" ")[0];

        if (!commands.includes(command) && !commandsWithContent.includes(command) && !AdminCommands.includes(command) && !AdminCommandsWithContent.includes(command)) {
            await sleep(1000);
            await sendMessageAutoDelete(senderNumber, { text: `❌ Invalid command. List commands with !commands` });
            return;
        }

        if (text.startsWith('!ChooseName')) {
            let name = text.replace('!ChooseName', '').trim().replace(/ /g, '_');

            if (!rulesAccepted) {
                await sleep(1000);
                await sendMessageAutoDelete(senderNumber, { text: `❌ Please verify the rules first.` });
                return;
            }

            if (!name) {
                await sleep(1000);
                await sendMessageAutoDelete(senderNumber, { text: `❌ Please provide a name! Example: !ChooseName John` });
                return;
            }

            if (FORBIDDEN_NAMES.some(forbidden => name.toLowerCase().includes(forbidden))) {
                if (!AdminsNumbers.includes(senderNumber)) {
                    await sleep(1000);
                    await sendMessageAutoDelete(senderNumber, { text: "❌ This name is forbidden." });
                    return;
                }
            }

            if (/[^a-zA-Z0-9_]/.test(name)) {
                await sleep(1000);
                await sendMessageAutoDelete(senderNumber, { text: `❌ Invalid Name. Use only letters, numbers, and _` });
                return;
            }

            const playerJid = isGroupMessage ? participantJid : senderNumber;
            const users = await loadUsers();
            users[playerJid] = {
                ...users[playerJid],
                name: name,
                coins: users[playerJid]?.coins || 0,
                shifumiswons: users[playerJid]?.shifumiswons || 0,
                shifumis: users[playerJid]?.shifumis || 0,
                stealswons: users[playerJid]?.stealswons || 0,
                steals: users[playerJid]?.steals || 0,
                inventory: users[playerJid]?.inventory || { mutePower: 0, antiMute: 0 }
            };
            await saveUsers(users);
            
            await sleep(1000);
            await sock.sendMessage(senderNumber, { text: `✅ Profile saved as: ${name}` });
            await sock.sendMessage(senderNumber, {text: `Here 100 🪙 for a good start !`})
            users[playerJid].coins = (users[playerJid].coins || 0) + 100;
            await saveUsers(users);
        }

        if (text.startsWith("!changeName")) {
            let newName = text.replace('!changeName', '').trim().replace(/ /g, '_');
            const playerJid = isGroupMessage ? participantJid : senderNumber;
            const users = await loadUsers();

            if (!users[playerJid]) {
                await sock.sendMessage(senderNumber, { text: `❌ Account not found. Use !ChooseName first.` });
                return;
            }

            if (!newName || /[^a-zA-Z0-9_]/.test(newName)) {
                await sock.sendMessage(senderNumber, { text: `❌ Invalid name. Use only letters, numbers, and _` });
                return;
            }

            users[playerJid].name = newName;
            await saveUsers(users);
            await sock.sendMessage(senderNumber, { text: `✅ Name updated to: ${newName}` });
        }

        if (text === "!commands") {
            await sleep(1000);
            await sock.sendMessage(senderNumber, { text: `✅ Commands list:\n- !ChooseName (name)\n- !changeName (name)\n- !contact\n- !rules\n- !shifumi\n- !joke\n- !profile\n- !profile @(person)\n- !steal @(person)\n- !guilds\n- !guild (guildname)\n- !join (guildname)\n- !commands\n- !forbiddenwords` });
        }

        if (text === "!commandfunctions") {
                await sleep(2000);
                await sock.sendMessage(senderNumber, { text: `✅ Commands list:\n- !ChooseName (name): You can choose the beaver name you want.\n- !changeName (name): you can update your beaver name\n- !contact : will give you a phone number and an email adress\n- !rules : see the rules of the group\n- !shifumi: play with me, but you will loose 🤡\n- !joke : will generate a hilarous joke\n- !profile : see your profile\n- !profile @(person) : see the profil of a group mate \n- !steal @(person) : try to steal 30 🪙 from the person mentionned\n- !guilds : see the guilds \n- !guild (guildname) : see the real profil of the guild mentionned\n- !join (guildname) : join the guild\n- !commands : see the commands\n- !forbiddenwords : see the forbidden words of the group and the sanctions` });
            }

        if (text === "!contact") {
            await sleep(1000);
            await sendMessageAutoDelete(senderNumber, { text: `Contact support: mechabeaver.contact@gmail.com | +33 6 85 76 66 21` });
        }

        if (text.startsWith("!profile")) {
            const args = text.trim().split(/\s+/);
            const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
            let targetJid = mentionedJid;

            if (!targetJid && args[1]) {
                targetJid = resolveJid(args[1]);
            }

            if (!targetJid) {
                targetJid = isGroupMessage ? participantJid : senderNumber;
            }

            const users = await loadUsers();

            targetJid = resolveAccountJid(users, targetJid);

            const targetUser = users[targetJid] || {};

            const HisName = targetUser.name || 'No name';
            const Hiscoins = targetUser.coins || 0;
            const HisWarns = targetUser.warns || 0;
            const shifumiswons = targetUser.shifumiswons || 0;
            const shifumis = targetUser.shifumis || 0;
            const stealswons = targetUser.stealswons || 0;
            const steals = targetUser.steals || 0;
            const mutePower = targetUser.inventory?.mutePower || 0;
            const antiMute = targetUser.inventory?.antiMute || 0;

            await sleep(1000);
            await sendMessageAutoDelete(senderNumber, { text: `✅ Ok here the profile of @${targetJid.split('@')[0]}`, mentions: [targetJid] });

            const profileText = 
                `👤 @${targetJid.split('@')[0]}\n` + 
                "```\n" +
                `🦫 Beaver name : ${HisName}\n` +
                "─────────────────────────────\n" +
                `🪙 Balance : ${Hiscoins} coins\n` +
                `⚠️ Warns   : ${HisWarns}/3\n` +
                "─────────────────────────────\n" +
                "🎒 INVENTORY\n" +
                `• Mute Power : x${mutePower} 💥\n` +
                `• Anti-Mute  : x${antiMute} 🛡️\n` +
                "─────────────────────────────\n" +
                "⚔️ Battles\n" +
                `• Shifumis won : ${shifumiswons}/${shifumis}\n` +
                `• Steals won   : ${stealswons}/${steals}\n` +
                "```";

            await sendMessageAutoDelete(senderNumber, { text: profileText, mentions: [targetJid] });
            return;
        }

        if (text.startsWith("!steal")) {
            if (!isGroupMessage) return;

            const mentionedJid = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
            const [cmd, rawNum] = text.split(' ');

            let targetJid = mentionedJid;

            if (!targetJid) {
                targetJid = resolveJid(rawNum);

                if (!targetJid) {
                    await sendMessageAutoDelete(senderNumber, { text: `❌ Mention someone (@) or specify a target number! Ex: !steal 33612345678` });
                    return;
                }
            }

            if (mentionedJid) {
                const isSelfSteal = targetJid === participantJid
                    || targetJid === message.key.participantAlt
                    || targetJid === message.key.senderPN;

                if (isSelfSteal) {
                    await sleep(1000);
                    await sendMessageAutoDelete(senderNumber, { text: `🤡 You can't steal yourself!` });
                    return;
                }

                try {
                    const metadata = await sock.groupMetadata(senderNumber);
                    const isTargetInGroup = metadata.participants.some(p => p.id === targetJid);

                    if (!isTargetInGroup) {
                        await sleep(1000);
                        await sendMessageAutoDelete(senderNumber, { text: `❌ This user is not in this group!` });
                        return;
                    }
                } catch (e) {
                    console.error('Erreur vérification membres :', e);
                    return;
                }

                await steal(targetJid);
                return;
            }

            const cleanTargetNum = targetJid.split('@')[0];
            const usersForSteal = await loadUsers();

            const senderCandidates = [
                participantJid,
                message.key.participantAlt,
                message.key.senderPN
            ].filter(Boolean);

            const isSelfSteal = senderCandidates.some(jid => jid.split('@')[0] === cleanTargetNum)
                || senderCandidates.includes(targetJid)
                || jidMatchesNumber(participantJid, cleanTargetNum, usersForSteal);

            if (isSelfSteal) {
                await sleep(1000);
                await sendMessageAutoDelete(senderNumber, { text: `🤡 You can't steal yourself!` });
                return;
            }

            try {
                const metadata = await sock.groupMetadata(senderNumber);
                const isTargetInGroup = metadata.participants.some(p => jidMatchesNumber(p.id, cleanTargetNum, usersForSteal));

                if (!isTargetInGroup) {
                    await sleep(1000);
                    await sendMessageAutoDelete(senderNumber, { text: `❌ This user is not in this group!` });
                    return;
                }
            } catch (e) {
                console.error('Erreur vérification membres :', e);
                return;
            }

            await steal(targetJid);
            return;
        }

        if (text.startsWith("!give")) {
            const giverJid = isGroupMessage ? participantJid : senderNumber;

            if (!AdminsNumbers.includes(giverJid)) {
                await sleep(3000);
                await sendMessageAutoDelete(senderNumber, { text: `❌ You think you can do that ? no no no 🤡` });
                return;
            }

            const args = text.trim().split(/\s+/);

            const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
            let targetJid = mentionedJid;
            let amountArgIndex = 2;

            if (!targetJid) {
                targetJid = resolveJid(args[1]);
            }

            const amount = parseInt(args[amountArgIndex]);

            if (!targetJid) {
                await sleep(1500);
                await sendMessageAutoDelete(senderNumber, { text: `❌ Mention someone (@) or send the phone number of the target` });
                return;
            }

            if (!amount || isNaN(amount)) {
                await sleep(1500);
                await sendMessageAutoDelete(senderNumber, { text: `❌ Please specify a valid amount of coins` });
                return;
            }

            const users = await loadUsers();

            targetJid = resolveAccountJid(users, targetJid);

            if (!users[targetJid]) {
                users[targetJid] = { coins: 0 };
            }

            users[targetJid].coins = (users[targetJid].coins || 0) + amount;
            await saveUsers(users);

            await sleep(2000);
            await sendMessageAutoDelete(senderNumber, { text: `✅ Ok ${amount} 🪙 gave to @${targetJid.split('@')[0]}`, mentions: [targetJid] });
        }

        if (text === "!guilds") {
            const guildsData = await loadGuilds();
            const guildList = Object.values(guildsData);
            if (Object.keys(guildsData).length === 0) {
                await sendMessageAutoDelete(senderNumber, { text: `There are no guilds yet: Be the first to create one with !CreateGuild (Name)` });
            } else {
                const msgguilds = guildList.map(g => `• ${g.name}`).join('\n');

                await sleep(1000);
                await sendMessageAutoDelete(senderNumber, { text: `🏰 guilds \n${msgguilds}` });
            }
            return;
        }

        if (text.startsWith("!CreateGuild")) {
            const guildName = text.replace('!CreateGuild', '').trim().replace(/ /g, '_');
            const playerJid = isGroupMessage ? participantJid : senderNumber;

            const guilds = await loadGuilds();

            const alreadyInAGuild = Object.values(guilds).some(g => g.members?.includes(playerJid));
            if (alreadyInAGuild) {
                await sleep(1000);
                await sendMessageAutoDelete(senderNumber, { text: `❌ You are already in a guild, leave it before creating a new one` });
                return;
            }

            if (!guildName || /[^a-zA-Z0-9_]/.test(guildName)) {
                await sendMessageAutoDelete(senderNumber, { text: `❌ Invalid name, use only letters, numbers and _` });
                return;
            }

            const nameExists = Object.values(guilds).some(g => g.name.toLowerCase() === guildName.toLowerCase());
            if (nameExists) {
                await sendMessageAutoDelete(senderNumber, { text: `❌ This name is already taken !` });
                return;
            }

            const guildId = `guild_${Date.now()}`;
            guilds[guildId] = {
                name: guildName,
                leader: playerJid,
                DateCreate: Date.now(),
                guildLevel: 1,
                guildcoins: 0,
                guildRank: 0,
                memberCount: 1,
                maxMembers: 31,
                members: [playerJid],
                buffs: { xpBoost: 0, coinBonus: 0 },
                stats: { warsWon: 0, warsLost: 0 }
            };

            await saveGuilds(guilds);

            const guildData = await formatGuildText(guildId, guilds);

            await sleep(2000);
            await sendMessageAutoDelete(senderNumber, { text: `✅ Successful guild ${guildName} created ! Join him/her now !` });
            await sleep(1000);
            await sock.sendMessage(senderNumber, { text: guildData.text, mentions: [guildData.leaderJid] });
            await sleep(1000);
            await sendMessageAutoDelete(senderNumber, { text: `Edit or choose a description with !description` });
            return;
        }

        if (text.startsWith("!guild ")) {
            const requestedName = text.replace('!guild', '').trim();
            const guilds = await loadGuilds();

            const guildId = Object.keys(guilds).find(
                id => guilds[id].name.toLowerCase() === requestedName.toLowerCase()
            );

            if (!guildId) {
                await sleep(1500);
                await sendMessageAutoDelete(senderNumber, { text: `❌ There is no guild : ${requestedName}` });
                return;
            }

            const guildData = await formatGuildText(guildId, guilds);

            await sleep(1000);
            await sock.sendMessage(senderNumber, { text: guildData.text, mentions: [guildData.leaderJid] });
            return;
        }

        if (text.startsWith("!join ")) {
            const requestedName = text.replace('!join', '').trim();
            const guilds = await loadGuilds();
            const playerJid = isGroupMessage ? participantJid : senderNumber;

            const guildId = Object.keys(guilds).find(
                id => guilds[id].name.toLowerCase() === requestedName.toLowerCase()
            );

            if (!guildId) {
                await sleep(1500);
                await sendMessageAutoDelete(senderNumber, { text: `❌ There is no guild : ${requestedName}` });
                return;
            }

            const targetGuild = guilds[guildId];

            const currentGuildEntry = Object.entries(guilds).find(([_, g]) => g.members?.includes(playerJid));

            if (currentGuildEntry) {
                const [currentGuildId, currentGuild] = currentGuildEntry;

                if (currentGuildId === guildId) {
                    await sleep(1000);
                    await sendMessageAutoDelete(senderNumber, { text: `❌ You are already in ${targetGuild.name} !` });
                    return;
                }

                const isLeader = currentGuild.leader === playerJid;
                const switchState = {
                    admin: playerJid,
                    fromGuildId: currentGuildId,
                    toGuildId: guildId,
                    isLeader,
                    expiresAt: Date.now() + 3 * 60 * 1000
                };

                if (isGroupMessage) {
                    groupData.waitingForGuildSwitch = switchState;
                    groups[senderNumber] = groupData;
                    await saveGroups(groups);
                } else {
                    const users = await loadUsers();
                    if (!users[senderNumber]) users[senderNumber] = {};
                    users[senderNumber].waitingForGuildSwitch = switchState;
                    await saveUsers(users);
                }

                await sleep(1500);
                if (isLeader) {
                    await sendMessageAutoDelete(senderNumber, { text: `❌ You are already in a guild and you are the leader, want to give the guild to someone ?` });
                    await sleep(1500);
                    await sendMessageAutoDelete(senderNumber, { text: `Type Y @(person) to give it and join ${requestedName}, or N to stay in ${currentGuild.name}, within 3min` });
                } else {
                    await sendMessageAutoDelete(senderNumber, { text: `❌ You are already in ${currentGuild.name}. Type Y to leave it and join ${requestedName}, or N to stay, within 3min` });
                }
                return;
            }

            if (!targetGuild.members) targetGuild.members = [];

            if (targetGuild.members.length >= targetGuild.maxMembers) {
                await sleep(1000);
                await sendMessageAutoDelete(senderNumber, { text: `❌ This guild is full, sorry` });
                return;
            }

            targetGuild.members.push(playerJid);
            targetGuild.memberCount = targetGuild.members.length;

            await saveGuilds(guilds);

            await sleep(1500);
            await sendMessageAutoDelete(senderNumber, { text: `✅ @${playerJid.split('@')[0]} joined ${targetGuild.name} !`, mentions: [playerJid] });

            const guildData = await formatGuildText(guildId, guilds);

            await sleep(1000);
            await sock.sendMessage(senderNumber, { text: guildData.text, mentions: [guildData.leaderJid] });
            return;
        }
    });
}

mongoose.connection.once('open', () => {
    connectToWhatsApp();
});

app.post('/send-code', async (req, res) => {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code || !sock) return res.status(400).json({ success: false });

    const cleanNumber = `${phoneNumber.replace(/\D/g, '')}@s.whatsapp.net`;
    try {
        await sendMessageAutoDelete(cleanNumber, { text: `Here is your code: ${code}` });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/send-HelloMessage', async (req, res) => {
    const { phoneNumber } = req.body;
    const users = await loadUsers();
    const cleanNumber = `${phoneNumber.replace(/\D/g, '')}@s.whatsapp.net`;
    const userData = users[cleanNumber];
    const rulesAccepted = userData?.rulesAccepted === true;
    if (!phoneNumber || !sock) {
        return res.status(400).json({ success: false, error: 'No phone number ! ' });
    }
    if (rulesAccepted) {
        try {
            await sock.sendMessage(cleanNumber, { text: `Hi thanks to re-use MechaBeaver !` });
            return res.json({ success: true, message: "Success, you have refind your account !" });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    } else {
        try {
            const rulesText = 
                "Hi thanks to use MechaBeaver !\n" +
                "Some Rules for the first time:\n" +
                "-Never call MechaBeaver you can join support here (+33 6 85 76 66 21) (mechabeaver.support@gmail.com)\n" +
                "-Don't spam the bot\n" +
                "-Put the emoji ✅ in reaction for Don't see that message in the future ! First You need to choose a name for Save your profile with the command !ChooseName";

            await sock.sendMessage(cleanNumber, { text: rulesText });

            return res.json({ success: true, message: "Success, you can now awnser to mechabeaver" });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
    
});

app.get('/ping', (req, res) => {
  res.send('OK');
});

app.get('/', (req, res) => {
  res.send('Bot en ligne !');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Serveur actif sur le port ${port}`));
