# syntax=docker/dockerfile:1.3
# Włączenie rozszerzonego frontendu BuildKit

# ETAP 1: Budowa (wieloetapowe budowanie obrazu)

# Wykorzystanie warstwy scratch zgodnie z wymogami zadania
# Pozwala to na pełną kontrolę nad rozmiarem środowiska
FROM scratch AS builder

# Dodajemy minimalny system plików Alpine Linux
ADD alpine-minirootfs-3.19.1-x86_64.tar.gz /

WORKDIR /app

# Kopiujemy tylko plik źródłowy. Ponieważ nasza aplikacja nie ma pliku 
# package.json (nie wymaga npm install)
COPY server.js .

# ETAP 2: Obraz produkcyjny
# Używamy najlżejszego możliwego punktu wyjścia (czysty Alpine) 
# zamiast oficjalnego, ciężkiego obrazu node:alpine
FROM alpine:3.19 AS prod

# Informacja na temat autora zgodna ze standardem OCI
LABEL org.opencontainers.image.authors="Roman Rybak"
LABEL org.opencontainers.image.title="Zadanie 1 - Pogoda"

# Optymalizacja pod kątem zawartości i ilości warstw:
# Łączymy polecenia aktualizacji i instalacji za pomocą &&
# Instalujemy tylko niezbędny nodejs
# Dodajemy flagę --no-cache i w tej samej instrukcji RUN fizycznie usuwamy 
#    menedżer pakietów (apk), aby uniknąć tworzenia warstwy z niepotrzebnymi danymi
RUN apk update && \
    apk add --no-cache nodejs && \
    rm -rf /var/cache/apk/* /etc/apk /lib/apk /sbin/apk /usr/share/apk /var/lib/apk

# Uruchamianie aplikacji z uprawnieniami użytkownika bez przywilejów root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

WORKDIR /home/appuser/app

# Kopiowanie gotowej aplikacji z etapu "builder" z odpowiednimi uprawnieniami
COPY --from=builder --chown=appuser:appgroup /app/server.js ./server.js

EXPOSE 8080

# Wdrożenie mechanizmu Healthcheck
# Monitoruje, czy serwer HTTP odpowiada. Używamy wbudowanego, lekkiego
# narzędzia wget zamiast instalowania curl-a
HEALTHCHECK --interval=10s --timeout=3s --start-period=2s --retries=3 \
    CMD wget -q -O - http://localhost:8080/ || exit 1

# Punkt wejścia aplikacji
ENTRYPOINT ["node", "server.js"]