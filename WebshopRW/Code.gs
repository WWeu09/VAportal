// --- CONFIGURATIE ---
const SHEET_ID = "10Hxo2tDNtatd4VqZOmaT7oAQj9V_NSxoglKL_CdplK8";
const PRODUCTS_SHEET = "Products";
const ORDERS_SHEET = "Orders";

const ORDER_HEADERS = [
  "ID",
  "Naam",
  "Email",
  "Straat",
  "Huisnummer",
  "Postcode",
  "Stad",
  "Land",
  "ProductID",
  "Productnaam",
  "Productcategorie",
  "Productvariant",
  "Aantal",
  "Status",
  "Betaallink",
  "TrackTrace",
  "VerzendMethode",
  "Datum",
  "Klantnotities"
];

// --- DO GET (API GET requests) ---
function doGet(e) {
  const action = e.parameter.action;

  if (action === "getProducts") {
    return jsonResponse(getProducts());
  }

  if (action === "getOrders") {
    return jsonResponse(getOrders());
  }

  return jsonResponse({ success: false, error: "Invalid GET request" });
}

// --- DO POST (API POST requests) ---
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");
    const action = data.action;

    if (action === "createOrder") {
      return jsonResponse(createOrder(data));
    }

    if (action === "updateOrder") {
      return jsonResponse(updateOrder(data));
    }

    return jsonResponse({ success: false, error: "Invalid POST request" });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

// --- PRODUCTS FUNCTIES ---
function getProducts() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(PRODUCTS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  return data.map(function(row) {
    const obj = {};
    headers.forEach(function(header, index) {
      obj[header] = row[index];
    });
    return obj;
  });
}

// --- ORDERS FUNCTIES ---
function getOrders() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ORDERS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  return data.map(function(row) {
    const obj = {};
    headers.forEach(function(header, index) {
      obj[header] = row[index];
    });
    return obj;
  });
}

// --- CREATE ORDER ---
function createOrder(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ORDERS_SHEET);
  ensureOrderHeaders(sheet);

  const orderId = Date.now();
  const order = {
    ID: orderId,
    Naam: data.name || "",
    Email: data.email || "",
    Straat: data.street || "",
    Huisnummer: data.houseNumber || "",
    Postcode: data.postcode || "",
    Stad: data.city || "",
    Land: data.country || "",
    ProductID: data.productID || "",
    Productnaam: data.productName || "",
    Productcategorie: data.productCategory || "",
    Productvariant: data.productVariant || "",
    Aantal: data.amount || 1,
    Status: "pending",
    Betaallink: "",
    TrackTrace: "",
    VerzendMethode: data.shipping || "",
    Datum: new Date(),
    Klantnotities: data.customerNotes || ""
  };

  const row = ORDER_HEADERS.map(function(header) {
    return order[header];
  });

  sheet.appendRow(row);

  MailApp.sendEmail({
    to: order.Email,
    subject: "Bestelling ontvangen",
    htmlBody:
      "<h3>Bedankt voor je bestelling!</h3>" +
      "<p>We hebben je bestelling ontvangen en nemen contact op zodra deze wordt goedgekeurd.</p>" +
      "<p>Order ID: " + orderId + "</p>"
  });

  return { success: true, orderId: orderId };
}

// --- UPDATE ORDER (ADMIN) ---
function updateOrder(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ORDERS_SHEET);
  ensureOrderHeaders(sheet);

  const dataRange = sheet.getDataRange();
  const rows = dataRange.getValues();
  const headers = rows[0];
  const columnMap = createColumnMap(headers);

  for (let i = 1; i < rows.length; i++) {
    const currentId = rows[i][columnMap.ID];
    if (String(currentId) !== String(data.id)) {
      continue;
    }

    if (data.status) {
      sheet.getRange(i + 1, columnMap.Status + 1).setValue(data.status);
    }

    if (data.betaallink !== undefined && data.betaallink !== null && data.betaallink !== "") {
      sheet.getRange(i + 1, columnMap.Betaallink + 1).setValue(data.betaallink);
      MailApp.sendEmail({
        to: rows[i][columnMap.Email],
        subject: "Betaal je bestelling",
        htmlBody:
          "<h3>Betaal je bestelling</h3>" +
          '<p>Betaal via deze link: <a href="' + data.betaallink + '">' + data.betaallink + "</a></p>" +
          "<p>Order ID: " + data.id + "</p>"
      });
    }

    if (data.tracktrace !== undefined && data.tracktrace !== null && data.tracktrace !== "") {
      sheet.getRange(i + 1, columnMap.TrackTrace + 1).setValue(data.tracktrace);
      MailApp.sendEmail({
        to: rows[i][columnMap.Email],
        subject: "Je bestelling is verzonden",
        htmlBody:
          "<h3>Je bestelling is onderweg!</h3>" +
          '<p>Track & trace: <a href="' + data.tracktrace + '">' + data.tracktrace + "</a></p>" +
          "<p>Order ID: " + data.id + "</p>"
      });
    }

    return { success: true, id: data.id };
  }

  return { success: false, error: "Order not found" };
}

function ensureOrderHeaders(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, ORDER_HEADERS.length);
  const currentHeaders = headerRange.getValues()[0];
  const hasCorrectHeaders = ORDER_HEADERS.every(function(header, index) {
    return currentHeaders[index] === header;
  });

  if (!hasCorrectHeaders) {
    headerRange.setValues([ORDER_HEADERS]);
  }
}

function createColumnMap(headers) {
  const map = {};
  headers.forEach(function(header, index) {
    map[header] = index;
  });
  return map;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
