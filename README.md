# Kaströrelse

En interaktiv simulering av kaströrelse för gymnasiefysik. Sidan visar banan med samma skala på båda axlarna och en hastighetsvektor vid bollen. Tidigare banor sparas streckade när värden ändras. Den använder HTML, CSS och JavaScript och kräver inga paket eller installationer.

## Öppna sidan

Dubbelklicka på `index.html` i projektmappen. Sidan öppnas i din vanliga webbläsare. Ändra hastighet, kastvinkel, starthöjd eller tyngdacceleration för att se hur banan och resultaten påverkas. Välj en planet eller måne i listan, eller skriv in ett eget värde på `g`.

Välj axelgränser i kontrollpanelen för att låsa diagrammets skala under jämförelser. Banor utanför gränserna klipps och ger en varning. Negativa eller vågräta kast kräver en starthöjd över marken. **Reset** återställer standardvärdena och tar bort sparade banor.

## Anpassa undervisningsmaterialet

- Öppna `content.js` för att ändra förklaringar och formler. Ändra texten mellan citattecknen och låt citattecken och kommatecken vara kvar.
- Öppna `physics.js` för att ändra standardvärdet för tyngdaccelerationen, `defaultGravity`. Listan med planeter och månar finns i `index.html`.
- `app.js` sköter beräkningar, diagram och interaktion. Du behöver inte ändra den för att anpassa texter eller standardvärde.

## Publicera på GitHub Pages

Du kan göra detta på GitHub-webbplatsen utan att skriva kommandon eller installera något:

1. Logga in på [GitHub](https://github.com/) och skapa ett nytt repository. Välj **Public** så att eleverna kan se sidan.
2. I det nya repositoryt väljer du **Add file → Upload files**.
3. Dra in projektets filer från datorn. Se till att `index.html` hamnar direkt i repositoryts rot, inte i en extra undermapp. Välj **Commit changes**.
4. Öppna **Settings → Pages** i repositoryt.
5. Under **Build and deployment**, välj **Deploy from a branch**. Välj grenen `main` och mappen `/ (root)`, och spara.
6. Vänta någon minut. Sidans länk visas på inställningssidan för Pages.

GitHub Pages publicerar filerna direkt; ingen byggprocess behövs. Git finns installerat på datorn om du senare vill lära dig att skicka ändringar via Git, men det behövs inte för stegen ovan.
