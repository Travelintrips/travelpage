import { google } from "googleapis";
import credentials from "./credentials.json"; // your downloaded JSON key

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID = "1Yt0HhaJbyQvHjKJ44CQBDhMQVz_Bt-Xu8yt9gb6L5vU";

async function appendCar(carData) {
  const values = [
    [
      carData.make,
      carData.model,
      carData.year,
      carData.license_plate,
      carData.status,
      carData.daily_rate,
      carData.category,
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "Kendaraan!B3", // change according to your sheet
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values,
    },
  });
}