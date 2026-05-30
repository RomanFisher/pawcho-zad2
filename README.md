# Sprawozdanie - Zadanie 1 (Część Obowiązkowa)

**Autor:** Roman Rybak

---

## 1. Kod oprogramowania

Aplikacja została napisana w środowisku Node.js z wykorzystaniem wyłącznie wbudowanych modułów (`http`, `https`), aby zminimalizować rozmiar końcowy (brak katalogu `node_modules`). Serwer po uruchomieniu loguje wymagane dane, a następnie serwuje interfejs webowy do sprawdzania pogody.
<img width="1534" height="795" alt="image" src="https://github.com/user-attachments/assets/23653dfd-84a4-4adc-9d6e-b0980361ec79" />
<img width="1649" height="1148" alt="image" src="https://github.com/user-attachments/assets/1987bc3d-84cd-4535-86aa-c1fa90c6513a" />


```javascript
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
```

## 2. Plik Dockerfile

Zastosowano optymalizację obrazu, aby powalczyć o minimalny rozmiar. 
Rozmiar nieskompresowanego obrazu na dysku (Disk Usage) wynosi zaledwie **89.3 MB**, co stanowi absolutne fizyczne minimum dla środowiska Node.js (ze względu na wagę samego silnika V8 oraz niezbędnych bibliotek systemowych). 

Co więcej, zoptymalizowany rozmiar skompresowanego kontentu (Content Size), który jest faktycznie przesyłany przez sieć, to jedyne **24.4 MB**!

<img width="1313" height="110" alt="image" src="https://github.com/user-attachments/assets/ab2c37e1-b815-4c33-b0f9-41cdc092c8e4" />

```
# syntax=docker/dockerfile:1.3
# Włączenie rozszerzonego frontendu BuildKit

# ETAP 1: Budowa (wieloetapowe budowanie obrazu)
# Wykorzystanie warstwy scratch zgodnie z wymogami zadania
# Pozwala to na pełną kontrolę nad rozmiarem środowiska od pierwszego bajta
FROM scratch AS builder

# Dodajemy minimalny system plików Alpine Linux
ADD alpine-minirootfs-3.19.1-x86_64.tar.gz /

# Optymalizacja ilości warstw:
COPY server.js /app/server.js

# ETAP 2: Obraz produkcyjny
# Używamy najlżejszego możliwego punktu wyjścia (czysty Alpine) 
# zamiast oficjalnego, ciężkiego obrazu node:alpine
FROM alpine:3.19 AS prod

# Informacja autora zgodna ze standardem OCI
# Łączymy metadane w jedną instrukcję LABEL, aby wygenerować tylko 1 warstwę zamiast 2
LABEL org.opencontainers.image.authors="Roman Rybak" \
      org.opencontainers.image.title="Zadanie 1 - Pogoda"

# Optymalizacja pod kątem zawartości i ilości fizycznych warstw:
# Flaga --no-cache pobiera indeksy w RAM, więc pomijamy polecenie 'apk update'
# Instalujemy tylko niezbędny silnik nodejs
# W tej samej instrukcji fizycznie usuwamy cały menedżer pakietów (apk)
# Tworzymy środowisko dla bezpiecznego użytkownika
# Wszystko to połączone znakiem && generuje dokładnie JEDNĄ fizyczną warstwę obrazu
RUN apk add --no-cache nodejs && \
    rm -rf /var/cache/apk/* /etc/apk /lib/apk /sbin/apk /usr/share/apk /var/lib/apk && \
    addgroup -S appgroup && adduser -S appuser -G appgroup

# Przygotowanie przestrzeni roboczej w kontenerze
WORKDIR /home/appuser/app

# Kopiowanie gotowej aplikacji z etapu "builder"
COPY --from=builder --chown=appuser:appgroup /app/server.js ./server.js

# Uruchamianie aplikacji z uprawnieniami użytkownika bez przywilejów root
USER appuser

EXPOSE 8080

# Wdrożenie mechanizmu Healthcheck
# Monitoruje, czy serwer HTTP odpowiada. Używamy wbudowanego, lekkiego
# narzędzia wget zamiast instalowania ciężkiego curl-a
HEALTHCHECK --interval=10s --timeout=3s --start-period=2s --retries=3 \
    CMD wget -q -O - http://localhost:8080/ || exit 1

# Punkt wejścia aplikacji
ENTRYPOINT ["node", "server.js"]
```

## 3. Polecenia wykorzystane w procesie

a. Zbudowanie opracowanego obrazu kontenera
Wykorzystano wieloetapowe budowanie.
<img width="1344" height="870" alt="image" src="https://github.com/user-attachments/assets/593923b6-4fcb-4f99-b061-fafd91dea645" />
```bash
docker build -t zadanie1:Rybak_101752 .
```

b. Uruchomienie kontenera na podstawie zbudowanego obrazu
Kontener uruchamiany w tle (detached) z mapowaniem portów.
<img width="1250" height="61" alt="image" src="https://github.com/user-attachments/assets/5ed706d5-f93f-4350-9b75-5079f90e283d" />
```bash
docker run -d -p 8081:8080 --name app_weather zadanie1:Rybak_101752
```

c. Uzyskania informacji z logów
Sprawdzenie wymogów z punktu 1a (data, autor, port).
<img width="1324" height="336" alt="image" src="https://github.com/user-attachments/assets/24c8cd15-c05c-4725-9765-283c7929186e" />
```bash
docker logs app_weather
```

d. Sprawdzenie ilości warstw oraz rozmiaru obrazu
Sprawdzenie rozmiaru końcowego obrazu (~89 MB):
<img width="1302" height="107" alt="image" src="https://github.com/user-attachments/assets/016e29c1-2b57-4826-95d8-2812685af478" />
```bash
docker images zadanie1:Rybak_101752
```
Sprawdzenie ilości warstw i szczegółowej wagi poszczególnych komend:
<img width="1314" height="319" alt="image" src="https://github.com/user-attachments/assets/de5feb63-2a18-4db1-845d-10172ad8bd5e" />
```bash
docker history zadanie1:Rybak_101752
```
**Link do DockerHub:** `[https://hub.docker.com/r/romanfisher/zadanie1/tags](https://hub.docker.com/r/romanfisher/zadanie1/tags)`

