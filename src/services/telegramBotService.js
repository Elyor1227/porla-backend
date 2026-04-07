const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");

let botInstance = null;

function esc(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getAdminMenu() {
  return {
    reply_markup: {
      keyboard: [[{ text: "📋 Kutilayotgan to'lovlar" }], [{ text: "📊 Statistika" }]],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };
}

function getUserMenu() {
  return {
    reply_markup: {
      keyboard: [
        [{ text: "🛒 PREMIUM sotib olish" }],
        [{ text: "📞 Admin bilan bog'lanish" }, { text: "ℹ️ Yordam" }],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };
}

function startTelegramBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.log("ℹ️  BOT_TOKEN yo'q, Telegram bot ishga tushirilmadi");
    return null;
  }
  if (botInstance) return botInstance;

  const adminIds = String(process.env.ADMIN_IDS || "")
    .split(",")
    .map((v) => parseInt(v.trim(), 10))
    .filter(Number.isFinite);

  const price = process.env.PRICE || "37 000";
  const cardNumber = process.env.CARD_NUMBER || "0000 0000 0000 0000";
  const adminContact = process.env.ADMIN_CONTACT || "@admin_username";

  const db = mongoose.connection.db;
  const usersCollection = db.collection("tg_users");
  const paymentsCollection = db.collection("tg_payments");
  const userState = new Map();

  const bot = new TelegramBot(token, { polling: true });
  const isAdmin = (userId) => adminIds.includes(userId);

  async function buyCommand(msg) {
    const chatId = msg.chat.id;
    const text = `<b>🛒 PREMIUM versiya xaridi</b>

Narxi: <b>${esc(price)} so'm</b>
Karta: <code>${esc(cardNumber)}</code>

To'lov qilgach, "To'lov qildim" tugmasini bosing va rasm caption'iga emailingizni yozing.`;

    return bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "✅ To'lov qildim", callback_data: "payment_done" }]],
      },
    });
  }

  bot.onText(/\/start/, async (msg) => {
    try {
      const userId = msg.from.id;
      const chatId = msg.chat.id;
      const username = msg.from.username || "";
      const firstName = msg.from.first_name || "";

      await usersCollection.updateOne(
        { user_id: userId },
        {
          $setOnInsert: {
            user_id: userId,
            username,
            first_name: firstName,
            is_premium: false,
            created_at: new Date(),
          },
        },
        { upsert: true }
      );

      await bot.sendMessage(
        chatId,
        `Salom, ${esc(firstName)}!\nQuyidagi tugmalardan foydalaning.`,
        isAdmin(userId) ? getAdminMenu() : getUserMenu()
      );
    } catch (e) {
      console.error("[BOT:/start]", e.message);
    }
  });

  bot.onText(/\/buy/, buyCommand);

  bot.on("callback_query", async (query) => {
    try {
      const data = query.data;
      const chatId = query.message.chat.id;
      const userId = query.from.id;

      if (data === "payment_done") {
        userState.set(chatId, "awaiting_screenshot");
        await bot.sendMessage(
          chatId,
          "Chek rasmini yuboring va caption'ga email yozing.\nMisol: example@mail.com"
        );
        return bot.answerCallbackQuery(query.id);
      }

      if (data === "cancel_payment") {
        userState.delete(chatId);
        await bot.sendMessage(chatId, "Bekor qilindi.", isAdmin(userId) ? getAdminMenu() : getUserMenu());
        return bot.answerCallbackQuery(query.id);
      }
    } catch (e) {
      console.error("[BOT:callback_query]", e.message);
    }
  });

  bot.on("photo", async (msg) => {
    try {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const state = userState.get(chatId);
      if (state !== "awaiting_screenshot") return;

      const caption = String(msg.caption || "").trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(caption)) {
        return bot.sendMessage(
          chatId,
          "❌ Iltimos, rasm caption'iga to'g'ri email yozing.\nMisol: example@domain.com",
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{ text: "❌ Bekor qilish", callback_data: "cancel_payment" }]],
            },
          }
        );
      }

      const username = msg.from.username || msg.from.first_name || "";
      const fileId = msg.photo[msg.photo.length - 1].file_id;

      const result = await paymentsCollection.insertOne({
        user_id: userId,
        username,
        email: caption,
        file_id: fileId,
        status: "pending",
        created_at: new Date(),
      });
      const paymentId = result.insertedId.toString();
      userState.delete(chatId);

      await bot.sendMessage(
        chatId,
        "✅ Chekingiz qabul qilindi. Admin tekshiruvdan keyin xabar beradi.",
        getUserMenu()
      );

      const adminCaption = `<b>Yangi to'lov cheki</b>
👤 Foydalanuvchi: @${esc(username)} (ID: ${userId})
📧 Email: ${esc(caption)}
🆔 To'lov ID: <code>${paymentId}</code>`;

      for (const adminId of adminIds) {
        await bot.sendPhoto(adminId, fileId, {
          caption: adminCaption,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Tasdiqlash", callback_data: `accept_${paymentId}` },
                { text: "❌ Rad etish", callback_data: `reject_${paymentId}` },
              ],
            ],
          },
        });
      }
    } catch (e) {
      console.error("[BOT:photo]", e.message);
    }
  });

  bot.onText(/\/accept (.+)/, async (msg, match) => {
    if (!isAdmin(msg.from.id)) return;
    const id = match[1];
    const objectId = new mongoose.Types.ObjectId(id);
    const payment = await paymentsCollection.findOne({ _id: objectId });
    if (!payment || payment.status !== "pending") {
      return bot.sendMessage(msg.chat.id, "To'lov topilmadi yoki allaqachon ko'rilgan.");
    }
    await paymentsCollection.updateOne({ _id: objectId }, { $set: { status: "approved" } });
    await usersCollection.updateOne({ user_id: payment.user_id }, { $set: { is_premium: true } }, { upsert: true });
    await bot.sendMessage(payment.user_id, "🎉 To'lov tasdiqlandi! PRO berildi.");
    await bot.sendMessage(msg.chat.id, `✅ ${id} tasdiqlandi.`);
  });

  bot.onText(/\/reject (.+)/, async (msg, match) => {
    if (!isAdmin(msg.from.id)) return;
    const id = match[1];
    const objectId = new mongoose.Types.ObjectId(id);
    const payment = await paymentsCollection.findOne({ _id: objectId });
    if (!payment || payment.status !== "pending") {
      return bot.sendMessage(msg.chat.id, "To'lov topilmadi yoki allaqachon ko'rilgan.");
    }
    await paymentsCollection.updateOne({ _id: objectId }, { $set: { status: "rejected" } });
    await bot.sendMessage(payment.user_id, "❌ To'lov rad etildi. Qayta yuboring.");
    await bot.sendMessage(msg.chat.id, `❌ ${id} rad etildi.`);
  });

  bot.on("message", async (msg) => {
    if (msg.photo || !msg.text) return;
    const text = msg.text;
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      if (isAdmin(userId)) {
        if (text === "📋 Kutilayotgan to'lovlar") {
          const pendings = await paymentsCollection.find({ status: "pending" }).sort({ created_at: -1 }).toArray();
          if (pendings.length === 0) return bot.sendMessage(chatId, "Kutilayotgan to'lovlar yo'q.", getAdminMenu());
          const body = pendings
            .map((p) => `🆔 <code>${p._id.toString()}</code> | 👤 ${esc(p.username || p.user_id)} | 📧 ${esc(p.email)}`)
            .join("\n");
          return bot.sendMessage(chatId, `<b>⏳ Kutilayotganlar</b>\n\n${body}`, {
            parse_mode: "HTML",
            ...getAdminMenu(),
          });
        }
        if (text === "📊 Statistika") {
          const [totalUsers, premiumUsers, totalPayments, approvedPayments, pendingPayments] = await Promise.all([
            usersCollection.countDocuments(),
            usersCollection.countDocuments({ is_premium: true }),
            paymentsCollection.countDocuments(),
            paymentsCollection.countDocuments({ status: "approved" }),
            paymentsCollection.countDocuments({ status: "pending" }),
          ]);
          return bot.sendMessage(
            chatId,
            `<b>📊 Bot statistikasi</b>\n\n👥 Jami: ${totalUsers}\n⭐ Premium: ${premiumUsers}\n💰 To'lovlar: ${totalPayments}\n✅ Tasdiqlangan: ${approvedPayments}\n⏳ Kutilayotgan: ${pendingPayments}`,
            { parse_mode: "HTML", ...getAdminMenu() }
          );
        }
        return bot.sendMessage(chatId, "Admin menyudagi tugmalardan foydalaning.", getAdminMenu());
      }

      if (text === "🛒 PREMIUM sotib olish") return buyCommand(msg);
      if (text === "📞 Admin bilan bog'lanish") {
        return bot.sendMessage(chatId, `Admin bilan bog'lanish: ${adminContact}`, getUserMenu());
      }
      if (text === "ℹ️ Yordam") {
        return bot.sendMessage(chatId, "Yordam: /start va /buy buyrug'idan foydalaning.", getUserMenu());
      }
      return bot.sendMessage(chatId, "Quyidagi tugmalardan foydalaning:", getUserMenu());
    } catch (e) {
      console.error("[BOT:message]", e.message);
    }
  });

  bot.on("polling_error", (err) => {
    console.error("[BOT:polling_error]", err.message);
  });

  console.log("🤖 Telegram bot ishga tushdi");
  botInstance = bot;
  return bot;
}

module.exports = { startTelegramBot };
