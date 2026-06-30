import { google } from "googleapis";
import { NextResponse } from "next/server";

// Exactamente los 16 campos del Google Sheet (el ID se genera en el servidor)
interface PropertyBody {
  title: string;
  description: string;
  price: string;
  image_link: string;
  link: string;
  custom_label_0: string;
  custom_label_1: string;
  custom_label_2: string;
  custom_label_3: string;
  custom_label_4: string;
  custom_number_0: string;
  custom_number_1: string;
  custom_number_2: string;
  custom_number_3: string;
  custom_number_4: string;
}

// Genera un ID único tipo PE-XXX-000
function generateId(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const prefix =
    letters[Math.floor(Math.random() * letters.length)] +
    letters[Math.floor(Math.random() * letters.length)];
  const number = String(Math.floor(Math.random() * 900) + 100); // 100-999
  const suffix = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix}-${number}-${suffix}`;
}

export async function POST(req: Request) {
  try {
    const body: PropertyBody = await req.json();

    // Validar variables de entorno
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!clientEmail || !privateKey || !spreadsheetId) {
      return NextResponse.json(
        { success: false, message: "Faltan variables de entorno de Google Sheets" },
        { status: 500 }
      );
    }

    // Autenticación Service Account
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Detectar la hoja por gid=1909380078
    const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetsList = spreadsheetMeta.data.sheets || [];
    const targetSheet = sheetsList.find(
      (s) => s.properties?.sheetId === 1909380078
    );
    const sheetName =
      targetSheet?.properties?.title ??
      sheetsList[0]?.properties?.title ??
      "Sheet1";

    // ID generado automáticamente
    const generatedId = generateId();

    // Orden EXACTO de columnas según el Sheet del usuario:
    // id | image_link | description | custom_label_0 | custom_label_1 | custom_label_2 |
    // custom_label_3 | custom_label_4 | custom_number_0 | custom_number_1 | custom_number_2 |
    // custom_number_3 | custom_number_4 | title | price | link
    const rowData = [
      generatedId,
      body.image_link || "",
      body.description || "",
      body.custom_label_0 || "",
      body.custom_label_1 || "",
      body.custom_label_2 || "",
      body.custom_label_3 || "",
      body.custom_label_4 || "",
      body.custom_number_0 || "",
      body.custom_number_1 || "",
      body.custom_number_2 || "",
      body.custom_number_3 || "",
      body.custom_number_4 || "",
      body.title || "",
      body.price || "",
      body.link || "",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:P`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [rowData] },
    });

    console.log(`✅ Insertado en hoja "${sheetName}" con ID ${generatedId}`);

    return NextResponse.json({
      success: true,
      message: "Propiedad registrada correctamente",
      id: generatedId,
      sheet: sheetName,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("❌ Error en API /submit:", message);
    return NextResponse.json(
      { success: false, message: "Error al guardar en Google Sheets", error: message },
      { status: 500 }
    );
  }
}
