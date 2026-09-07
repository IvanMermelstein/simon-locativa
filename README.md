# Simon Locativa

Juego de memoria de secuencias de colores (tipo "Simon Dice") con 6 botones, pensado
primero para tablet (también jugable en celular y desktop). Hecho con Next.js + React +
Tailwind.

## Reglas del juego

- La computadora muestra una secuencia de colores que crece una posición por ronda.
- El jugador debe repetir la secuencia completa tocando los 6 botones en el mismo orden.
- Cada ronda que se supera, la secuencia se reproduce un poco más rápido.
- Al primer error se termina la partida y se guarda el puntaje.

## Ranking

El puntaje se ordena por, en este orden de prioridad:

1. **Vueltas acertadas**: cantidad de rondas completas repetidas correctamente antes del error.
2. **Teclas acertadas dentro de la vuelta**: cuántos botones acertó dentro de la ronda en la que se equivocó.
3. **Menor tiempo**: tiempo total transcurrido desde que arrancó la partida hasta el error (a igualdad de las dos métricas anteriores, gana quien fue más rápido).

## Configurar Google Sheets

El ranking se guarda en una planilla de Google Sheets.

1. Creá una planilla nueva en Google Sheets (o reutilizá una existente).
2. En la primera fila de la primera hoja, agregá estos encabezados exactos:
   `firstName | lastName | rounds | keysInRound | time | createdAt`
3. Compartí la planilla (permiso de Editor) con el email de la cuenta de servicio de Google Cloud.
4. Copiá el ID de la planilla desde la URL:
   `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`
5. Completá `.env.local` (copiá `.env.local.example`) con:
   - `GOOGLE_SHEETS_SPREADSHEET_ID`: el ID del paso anterior.
   - `GOOGLE_SHEETS_CLIENT_EMAIL` y `GOOGLE_SHEETS_PRIVATE_KEY`: las credenciales de la cuenta de servicio.

## Desarrollo local

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Deploy en Vercel

1. Subí este proyecto a un repositorio de GitHub.
2. Importalo en Vercel.
3. Cargá las mismas 3 variables de entorno (`GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SHEETS_CLIENT_EMAIL`,
   `GOOGLE_SHEETS_PRIVATE_KEY`) en Project Settings → Environment Variables.
4. Deploy.
