const https = require("https");

function get(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log("Redirect to:", res.headers.location);
        return resolve(get(res.headers.location));
      }
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", (e) => resolve("Error: " + e.message));
  });
}

async function run() {
  const html = await get("https://drive.google.com/drive/folders/1ug3olhhWiIbAwqGjwaqrh1tcjEow_SLD");
  console.log("Fetched length:", html.length);
  const ids = html.match(/1[a-zA-Z0-9_-]{32}/g) || [];
  console.log("Drive-like IDs:", Array.from(new Set(ids)));
  
  // Find any filenames
  const filenames = html.match(/[\w\-.]+\.(?:png|jpg|jpeg|svg|webp|ico)/gi) || [];
  console.log("Filenames found:", Array.from(new Set(filenames)));
  
  // Check if there are titles
  const regex = /\["([^"]+)",\["([^"]+)"\]/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    if (m[1].includes(".png") || m[1].includes(".jpg") || m[1].includes(".svg") || m[1].includes("Logo")) {
      console.log("Found entry:", m[1], m[2]);
    }
  }
}

run();
