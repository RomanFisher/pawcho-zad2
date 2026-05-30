// Import wbudowanych modułów Node.js, aby uniknąć zewnętrznych zależności
const http = require('http');
const https = require('https');

// KONFIGURACJA 
const AUTHOR_NAME = "Roman Rybak";
const PORT = 8080; 


const commonCSS = `
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #74ebd5 0%, #ACB6E5 100%); 
            min-height: 100vh; 
            margin: 0; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: #333; 
        }
        .container { 
            background: rgba(255, 255, 255, 0.95); 
            padding: 30px; 
            border-radius: 15px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.15); 
            text-align: center; 
            max-width: 400px; 
            width: 90%; 
        }
        select, button { 
            width: 100%; 
            padding: 12px; 
            margin-top: 15px; 
            border-radius: 8px; 
            border: 1px solid #ddd; 
            font-size: 16px; 
            box-sizing: border-box; 
        }
        button { 
            background: #007bff; 
            color: white; 
            border: none; 
            cursor: pointer; 
            font-weight: bold; 
            transition: 0.3s; 
        }
        button:hover { background: #0056b3; }
        h2, h3 { margin-top: 0; color: #2c3e50; }
        .data-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 10px 0; 
            border-bottom: 1px solid #eee; 
            text-align: left;
        }
        .data-row span { color: #555; }
        .data-row:last-child { border-bottom: none; }
        a { 
            display: inline-block; 
            margin-top: 20px; 
            text-decoration: none; 
            color: #007bff; 
            font-weight: bold; 
        }
        a:hover { text-decoration: underline; }
    </style>
`;

// FUNKCJE POMOCNICZE 

// Mapowanie kodów pogodowych na opisy
function getWeatherDescription(code) {
    if (code === 0) return "Bezchmurnie";
    if (code > 0 && code <= 3) return "Zmienne zachmurzenie";
    if (code === 45 || code === 48) return "Mgła";
    if (code >= 51 && code <= 57) return "Mżawka";
    if (code >= 61 && code <= 67) return "Deszcz";
    if (code >= 71 && code <= 77) return "Śnieg";
    if (code >= 80 && code <= 82) return "Ulewa";
    if (code >= 95) return "Burza";
    return "Nieznana";
}

// Konwersja stopni na kierunki świata
function getWindDirectionLabel(degree) {
    if (degree >= 337.5 || degree < 22.5) return "Północny";
    if (degree >= 22.5 && degree < 67.5) return "Północno-wschodni";
    if (degree >= 67.5 && degree < 112.5) return "Wschodni";
    if (degree >= 112.5 && degree < 157.5) return "Południowo-wschodni";
    if (degree >= 157.5 && degree < 202.5) return "Południowy";
    if (degree >= 202.5 && degree < 247.5) return "Południowo-zachodni";
    if (degree >= 247.5 && degree < 292.5) return "Zachodni";
    if (degree >= 292.5 && degree < 337.5) return "Północno-zachodni";
    return "Nieznany";
}

// 1a. LOGOWANIE PRZY STARCIE
// Logowanie informacji o uruchomieniu serwera, autorze i porcie
const startTime = new Date().toLocaleString('pl-PL');
console.log("======================================");
console.log(`Data uruchomienia: ${startTime}`);
console.log(`Autor: ${AUTHOR_NAME}`);
console.log(`Aplikacja nasłuchuje na porcie: ${PORT}`);
console.log("======================================");

const server = http.createServer((req, res) => {
    // Parsowanie URL w celu obsługi odpowiednich ścieżek
    const url = new URL(req.url, `http://${req.headers.host}`);

    // 1b. INTERFEJS I WYBÓR MIASTA
    // Strona główna - Wybór miasta
    if (url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <!DOCTYPE html>
            <html lang="pl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Pogoda - Zadanie 1</title>
                ${commonCSS}
            </head>
            <body>
                <div class="container">
                    <h2>Sprawdź pogodę</h2>
                    <form action="/weather" method="GET">
                        <select name="city">
                            <option value="52.23,21.01,Warszawa">Warszawa</option>
                            <option value="51.25,22.57,Lublin">Lublin</option>
                            <option value="50.06,19.94,Kraków">Kraków</option>
                            <option value="51.10,17.03,Wrocław">Wrocław</option>
                            <option value="52.41,16.92,Poznań">Poznań</option>
                        </select>
                        <button type="submit">Pokaż wynik</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    } 
    // Obsługa zapytania o pogodę i integracja z zewnętrznym API
    else if (url.pathname === '/weather') {
        const cityParams = url.searchParams.get('city');
        // Walidacja przesłanych parametrów
        if (!cityParams || !cityParams.includes(',')) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end('<div class="container"><h3>Błąd</h3><a href="/">Powrót</a></div>');
        }
        // Dekonstrukcja parametrów i przygotowanie URL do API
        const [lat, lon, cityName] = cityParams.split(',');
        const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Europe/Warsaw`;

        // Logowanie żądania w konsoli
        console.log(`[LOG] Zapytanie do API dla miasta ${cityName}:\n -> ${apiUrl}`);

        // Wykonanie żądania HTTPS do zewnętrznego serwera
        https.get(apiUrl, (apiRes) => {
            let data = '';
            // Nasłuchiwanie na zdarzenie 'data' - odbieranie kolejnych paczek z API
            // i łączenie ich w jeden ciąg tekstowy
            apiRes.on('data', (chunk) => data += chunk);
            apiRes.on('end', () => {
                try {
                    // Deserializacja odebranego ciągu tekstowego do obiektu JSON
                    const json = JSON.parse(data);
                   
                    const weather = json.current_weather;
                    
                    // Transformacja kodów numerycznych na czytelne dla użytkownika opisy
                    const condition = getWeatherDescription(weather.weathercode);
                    const windDirection = getWindDirectionLabel(weather.winddirection);
                    
                    // Formatowanie znacznika czasu do lokalnego, czytelnego formatu
                    const dateObj = new Date(weather.time);
                    const formattedTime = dateObj.toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' });

                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`
                        <!DOCTYPE html>
                        <html lang="pl">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Wynik dla ${cityName}</title>
                            ${commonCSS}
                        </head>
                        <body>
                            <div class="container">
                                <h3>Pogoda: ${cityName}</h3>
                                
                                <div class="data-row">
                                    <span>Aktualizacja:</span>
                                    <b>${formattedTime}</b>
                                </div>
                                <div class="data-row">
                                    <span>Warunki:</span>
                                    <b>${condition}</b>
                                </div>
                                <div class="data-row">
                                    <span>Temperatura:</span>
                                    <b>${weather.temperature} °C</b>
                                </div>
                                <div class="data-row">
                                    <span>Wiatr:</span>
                                    <b>${weather.windspeed} km/h</b>
                                </div>
                                <div class="data-row">
                                    <span>Kierunek wiatru:</span>
                                    <b>${windDirection}</b>
                                </div>
                                
                                <a href="/">← Wybierz inne miasto</a>
                            </div>
                        </body>
                        </html>
                    `);
                } catch (e) {
                    // Obsługa błędów parsowania
                    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`<div class="container"><h3>Błąd przetwarzania danych: ${e.message}</h3><a href="/">Powrót</a></div>`);
                }
            });
        }).on('error', (err) => {
            // Obsługa błędów na poziomie sieci
            res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<div class="container"><h3>Błąd połączenia z API: ${err.message}</h3><a href="/">Powrót</a></div>`);
        });
    } else {
        // Obsługa 404 - Nie znaleziono
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html><html><head>${commonCSS}</head><body><div class="container"><h3>404 - Nie znaleziono</h3><a href="/">Powrót</a></div></body></html>`);
    }
});

server.listen(PORT);