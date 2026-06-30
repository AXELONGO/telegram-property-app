import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;

    // Si no hay mensaje de texto, simplemente respondemos 200 OK para que Telegram no reintente
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    
    // Solo respondemos a los comandos específicos
    if (text === "/start" || text === "/cargarpropiedad") {
      const BOT_TOKEN = process.env.BOT_TOKEN;
      const WEB_APP_URL = process.env.WEB_APP_URL;

      if (!BOT_TOKEN || !WEB_APP_URL) {
        console.error("Falta BOT_TOKEN o WEB_APP_URL en las variables de entorno");
        return NextResponse.json({ ok: false }, { status: 500 });
      }

      const replyText = text === "/start" 
        ? "¡Hola! Bienvenido al sistema de registro de propiedades. Toca el botón de abajo para llenar el formulario." 
        : "Abre el formulario para registrar una nueva propiedad tocando el botón:";

      const payload = {
        chat_id: chatId,
        text: replyText,
        reply_markup: {
          keyboard: [
            [{ text: "🏡 Registrar Propiedad", web_app: { url: WEB_APP_URL } }]
          ],
          resize_keyboard: true
        }
      };

      // Hacemos el request directo a la API de Telegram (sin depender de librerías extra)
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error procesando Webhook de Telegram:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
