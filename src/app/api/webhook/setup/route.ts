import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const hostUrl = url.searchParams.get("url");

  // Requerimos que nos pases tu dominio para registrarlo en Telegram
  // Ejemplo de uso: /api/webhook/setup?url=https://midominio.com
  if (!hostUrl) {
    return NextResponse.json(
      { error: "Falta el parámetro 'url'. Ejemplo: /api/webhook/setup?url=https://midominio.com" },
      { status: 400 }
    );
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    return NextResponse.json(
      { error: "Falta BOT_TOKEN en las variables de entorno" },
      { status: 500 }
    );
  }

  const webhookUrl = `${hostUrl.replace(/\/$/, "")}/api/webhook`;
  
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${webhookUrl}`);
    const data = await res.json();

    return NextResponse.json({
      success: true,
      message: "Webhook configurado en Telegram exitosamente",
      webhookUrl: webhookUrl,
      telegramResponse: data
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
