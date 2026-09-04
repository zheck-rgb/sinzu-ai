const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "sleeping",
  version: "3.0.0",
  hasPermission: 0,
  credits: "you",
  description: "Toggle sleeping mode autoreply on/off — random na 'sleeping' themed reply sa bawat message. Persistent at kayang sumabay kahit mabilis magmessage ang mga tao.",
  commandCategory: "fun",
  usages: "[on/off]",
  cooldowns: 3,
};

// Persistent storage — naka-save sa JSON file, kaya hindi mawawala kahit mag-restart ang bot
const DATA_FILE = path.join(__dirname, "sleeping_data.json");

function loadThreads() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      return new Set(JSON.parse(raw));
    }
  } catch (err) {
    console.log("Hindi ma-load ang sleeping_data.json:", err);
  }
  return new Set();
}

function saveThreads(threadsSet) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify([...threadsSet]), "utf8");
  } catch (err) {
    console.log("Hindi ma-save ang sleeping_data.json:", err);
  }
}

let sleepingThreads = loadThreads();

// Malaking listahan ng random sleeping-themed replies — mas marami, mas hindi paulit-ulit
const sleepingReplies = [
  "ops... ZzZzZzZzZ 😴",
  "ZzZzZzZzZ... huh? ano na naman?",
  "ops, natulog ako saglit, ZzZzZzZzZ",
  "ZzZzZzZzZ 💤 huwag mo akong gisingin.",
  "ops sorry, tulog mode pa ako ZzZzZzZzZ",
  "ZzZzZzZzZ... (di talaga nakikinig)",
  "ops ano raw? ZzZzZzZzZ",
  "ZzZzZzZzZ 😴 paalam sa mundo saglit.",
  "..zzz.. ano? gising na ba tayo?",
  "ops medyo antok pa ako, ZzZzZzZzZ 💤",
  "ZzZzZzZzZ 😪 5 minutes nalang...",
  "hmm? ah wag mo lang pansinin, ZzZzZzZzZ",
  "ops di ko na-catch yun, ZzZzZzZzZ",
  "ZzZzZzZzZ... (snore) ...ZzZzZzZzZ",
  "sandali lang, patapusin mo muna ako matulog 😴",
  "ops half-asleep pa ako, ulitin mo?",
  "ZzZzZzZzZ 💤 tara tulog na tayong lahat",
  "ano yun? ah okay, ZzZzZzZzZ...",
  "ops nakaidlip ako bigla, ZzZzZzZzZ",
  "ZzZzZzZzZ... busy pa ako sa panaginip",
];

// Kumuha ng random reply na hindi parehas sa huling isinend, para hindi kagad
// paulit-ulit kahit mabilis magmessage — mas natural ang randomness
const lastReplyByThread = new Map();

function getRandomReply(threadID) {
  let reply;
  const lastReply = lastReplyByThread.get(threadID);
  do {
    reply = sleepingReplies[Math.floor(Math.random() * sleepingReplies.length)];
  } while (reply === lastReply && sleepingReplies.length > 1);
  lastReplyByThread.set(threadID, reply);
  return reply;
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const option = args[0] ? args[0].toLowerCase() : null;
  const prefix = global.config?.PREFIX || "/";

  if (option === "on") {
    sleepingThreads.add(threadID);
    saveThreads(sleepingThreads);
    return api.sendMessage(
      "😴 Naka-ON na ang sleeping mode dito, permanente ito hangga't hindi mo in-off — kahit mag-restart pa ang bot.",
      threadID,
      messageID
    );
  }

  if (option === "off") {
    sleepingThreads.delete(threadID);
    saveThreads(sleepingThreads);
    return api.sendMessage("🌙 Naka-OFF na ang sleeping mode.", threadID, messageID);
  }

  return api.sendMessage(
    `Gamitin: ${prefix}sleeping on | ${prefix}sleeping off`,
    threadID,
    messageID
  );
};

// Hindi ito naka-await sa sendMessage — kaya hindi nagba-block ang susunod na
// event kahit sabay-sabay o sunod-sunod na magmessage ang mga tao sa GC.
// Bawat message, agad kumukuha ng sagot at nagpapadala nang independent sa isa't isa.
module.exports.handleEvent = function ({ api, event }) {
  const { threadID, senderID, body } = event;

  if (!sleepingThreads.has(threadID)) return;
  if (!body) return;
  if (senderID === api.getCurrentUserID()) return;

  const randomReply = getRandomReply(threadID);
  api.sendMessage(randomReply, threadID);
};
