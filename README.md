# Sprawozdanie - Zadanie 2 (Programowanie Aplikacji w Chmurze Obliczeniowej)

**Autor:** Roman Rybak

Niniejsze repozytorium zawiera kompletne rozwiązanie Zadania 2, obejmujące kody źródłowe aplikacji (z Zadania 1) oraz zautomatyzowany łańcuch w usłudze **GitHub Actions**. Pipeline buduje, testuje pod kątem bezpieczeństwa i publikuje wieloarchitekturowy obraz kontenera.

---
<img width="706" height="1323" alt="image" src="https://github.com/user-attachments/assets/10b74cfe-f34d-44ed-9b77-17dbcb1edce0" />


## 1. Architektura i Konfiguracja Łańcucha

Łańcuch został zdefiniowany w pliku `.github/workflows/deploy.yml`. Składa się z jednego głównego zadania (`build-and-push`), które jest wyzwalane automatycznie po wykonaniu operacji `push` na gałąź `main` lub ręcznie przez `workflow_dispatch`.

Proces opiera się na silniku **Docker Buildx** oraz emulatorze **QEMU**, co zostało skonfigurowane na początku pipeline'u:

```yaml
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

  ```

## 2. Realizacja Warunków Zadania

A. Wsparcie dla wielu architektur (Multi-arch)
Zgodnie z wymaganiami, docelowy obraz wspiera dwie architektury: linux/amd64 oraz linux/arm64. Zostało to osiągnięte poprzez dodanie odpowiedniego parametru platforms w kroku budowania:

```yaml
platforms: linux/amd64,linux/arm64

```
B. Zarządzanie danymi Cache (Pamięć podręczna)
Aby zoptymalizować czas budowania obrazów (szczególnie istotne przy budowach multi-stage), wdrożono zewnętrzny system buforowania oparty o DockerHub.

Zdecydowano się na rozdzielenie rejestrów: obraz produkcyjny trafia na ghcr.io, natomiast dane cache są eksportowane do zewnętrznego rejestru DockerHub. Zapobiega to "zaśmiecaniu" głównego repozytorium obrazów paczkami technicznymi.

Użyto eksportera typu registry z tagiem :cache.

Zastosowano tryb mode=max. W przeciwieństwie do domyślnego trybu min, tryb max nakazuje silnikowi BuildKit buforowanie absolutnie wszystkich warstw, w tym warstw z etapów pośrednich (np. warstwy budowania zależności, instalacji pakietów w multi-stage build). Zwiększa to szansę na odzysk cache'u (cache-hit) w kolejnych przebiegach pipeline'u.

```yaml
cache-from: type=registry,ref=${{ vars.DOCKERHUB_USERNAME }}/pawcho-cache:cache
cache-to: type=registry,ref=${{ vars.DOCKERHUB_USERNAME }}/pawcho-cache:cache,mode=max

```
C. Test bezpieczeństwa CVE (Wybór skanera)
Test podatności jest warunkiem krytycznym przed wysłaniem obrazu do publicznego rejestru (GHCR).

Uzasadnienie wyboru skanera Trivy:
Do realizacji testu wybrano skaner Trivy (akcja aquasecurity/trivy-action). Zgodnie z sugestią z zadania, poszukiwano rozwiązania najprostszego i najbardziej efektywnego.

Trivy działa w architekturze bezstanowej (stateless) i nie wymaga autoryzacji do chmury (jak Docker Scout) w celu przeskanowania lokalnego archiwum obrazu.

Potrafi błyskawicznie przerwać łańcuch CI/CD używając flagi exit-code: '1'.

Dzięki procesowi dwuetapowemu (najpierw budowa obrazu lokalnie z flagą load: true, skanowanie, a dopiero potem finalny multi-arch build i push: true), zagwarantowano, że obraz zawierający podatności CRITICAL lub HIGH nigdy nie opuści środowiska runnera i nie trafi na GHCR.

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'local-image-test:latest'
    format: 'table'
    exit-code: '1' # Natychmiastowe przerwanie pipeline'u
    ignore-unfixed: true
    vuln-type: 'os,library'
    severity: 'CRITICAL,HIGH'

```

## 3. Schemat Tagowania (Uzasadnienie i Dodatkowe Punkty)
Do automatycznego zarządzania tagami i adnotacjami (zgodnymi z OCI) użyto oficjalnej akcji docker/metadata-action.

Zrezygnowano z wyłącznego polegania na statycznym tagu :latest, ponieważ jest to antywzorzec (tzw. "latest-trap"), który uniemożliwia łatwy rollback. Zamiast tego zaimplementowano priorytetyzację tagów:

Short SHA (Priority 100): Każdy obraz jest tagowany skróconym hashem commitu Git (np. sha-00db10f). Zapewnia to absolutną niezmienność. Obraz staje się bezpośrednio powiązany z konkretną wersją kodu źródłowego.

SemVer (Priority 200): Aktywowany w przypadku publikacji tagów Git. Automatyzuje proces wersjonowania (np. v1.0.0).

Branch name: Tag zgodny z nazwą gałęzi (np. main), co ułatwia pobieranie najnowszej "roboczej" wersji do testów.

```yaml
- name: Extract Docker metadata
  id: meta
  uses: docker/metadata-action@v5
  with:
    images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
    flavor: latest=true
    tags: |
      type=ref,event=branch
      type=sha,priority=100,prefix=sha-,format=short
      type=semver,priority=200,pattern={{version}}

```
<img width="1410" height="86" alt="image" src="https://github.com/user-attachments/assets/26090014-76b6-4998-883c-cfaa5f94bced" />

## 4. Potwierdzenie działania
<img width="1308" height="88" alt="image" src="https://github.com/user-attachments/assets/ff8b9850-004f-47bb-aafb-aab73a3b8503" />

Łańcuch został uruchomiony z sukcesem, co można zweryfikować w zakładce Actions niniejszego repozytorium. Skaner Trivy nie wykrył krytycznych podatności, a finalny obraz wieloarchitekturowy został poprawnie przesłany i oznaczony jako Public w usłudze GitHub Packages (GHCR).

<img width="344" height="312" alt="image" src="https://github.com/user-attachments/assets/a1a3fd03-1fa3-41a5-aa5b-12aa012669dd" />

<img width="1057" height="217" alt="image" src="https://github.com/user-attachments/assets/3815abe9-7730-4b44-9f04-77c018d527f0" />
