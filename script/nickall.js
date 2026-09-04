module.exports.config = {
  name: "nickall",
  version: "2.0.0",
  hasPermission: 0,
  credits: "you",
  description: "Nagpapalit ng nickname ng LAHAT ng miyembro ng GC. May auto-retry kapag na-rate limit, para mabilis pero walang error kahit malaking grupo (200+ members).",
  commandCategory: "group",
  usages: "<bagong nickname>",
  cooldowns: 10,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Subukan i-set ang nickname, kung ma-rate limit, maghintay saglit tapos ulitin
async function setNicknameWithRetry(api, nickname, threadID, userID, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await api.changeNickname(nickname, threadID, userID);
      return true;
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      if (isLastAttempt) return false;
      // Kapag na-error (kadalasan rate limit), maghintay bago ulitin —
      // mas matagal ang hintay sa bawat susunod na retry
      await sleep(1500 * attempt);
    }
  }
  return false;
}

module.exports.run = async function ({ api, event, args }) {
  const { threadID, messageID } = event;
  const prefix = global.config?.PREFIX || "/";

  const newNickname = args.join(" ");
  if (!newNickname) {
    return api.sendMessage(
      `Gamitin: ${prefix}nickall <bagong nickname>\n` +
      `Halimbawa: ${prefix}nickall 😴 Sleeping Gang`,
      threadID,
      messageID
    );
  }

  let threadInfo;
  try {
    threadInfo = await api.getThreadInfo(threadID);
  } catch (err) {
    return api.sendMessage("❌ Hindi makuha ang info ng thread.", threadID, messageID);
  }

  const memberIDs = threadInfo.participantIDs || [];
  const total = memberIDs.length;

  await api.sendMessage(
    `⏳ Sisimulan na palitan ang nickname ng ${total} members. May auto-retry kapag may error, huwag itong iistorbohin.`,
    threadID,
    messageID
  );

  let success = 0;
  let failed = 0;
  const failedUsers = [];

  // Batch processing: ilang members nang sabay-sabay imbes na isa-isa nang sunod-sunod,
  // pero may maikling delay pa rin sa pagitan ng bawat batch para hindi mabigla ang rate limit
  const BATCH_SIZE = 5;
  const DELAY_BETWEEN_BATCHES = 800; // ms

  for (let i = 0; i < memberIDs.length; i += BATCH_SIZE) {
    const batch = memberIDs.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map((userID) => setNicknameWithRetry(api, newNickname, threadID, userID))
    );

    results.forEach((ok, idx) => {
      if (ok) {
        success++;
      } else {
        failed++;
        failedUsers.push(batch[idx]);
      }
    });

    if (i + BATCH_SIZE < memberIDs.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  return api.sendMessage(
    `✅ Tapos na! ${success}/${total} matagumpay na napalitan ang nickname.` +
    (failed > 0 ? `\n⚠️ ${failed} hindi napalitan pagkatapos ng retries (baka admin sila o walang permission ang bot).` : ""),
    threadID
  );
};
