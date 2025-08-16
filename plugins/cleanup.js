import fs from 'fs';
import path from 'path';
import { readdirSync, rmSync, statSync } from 'fs';

// La ruta a la carpeta de sesiones de los sub-bots
const sessionsFolder = path.join(global.__dirname(import.meta.url), '../JadiBots');

// Duración de inactividad para considerar una sesión como "vieja" (30 días)
const INACTIVE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

// Esta función se ejecuta para limpiar la carpeta
const cleanup = () => {
    console.log('[CLEANUP] Iniciando limpieza de sesiones inactivas...');
    if (!fs.existsSync(sessionsFolder)) {
        console.log('[CLEANUP] La carpeta JadiBots no existe, saltando.');
        return;
    }

    const subBotDirs = readdirSync(sessionsFolder);
    let cleanedCount = 0;

    for (const subBotDir of subBotDirs) {
        const fullPath = path.join(sessionsFolder, subBotDir);
        try {
            const stats = statSync(fullPath);
            if (!stats.isDirectory()) continue;

            const credsFile = path.join(fullPath, 'creds.json');
            if (!fs.existsSync(credsFile)) {
                console.log(`[CLEANUP] Eliminando carpeta sin creds.json: ${subBotDir}`);
                rmSync(fullPath, { recursive: true, force: true });
                cleanedCount++;
                continue;
            }

            const lastModified = stats.mtimeMs;
            const now = Date.now();

            if (now - lastModified > INACTIVE_THRESHOLD_MS) {
                console.log(`[CLEANUP] Eliminando sesión inactiva (más de 30 días): ${subBotDir}`);
                rmSync(fullPath, { recursive: true, force: true });
                cleanedCount++;
            }

        } catch (e) {
            console.error(`[CLEANUP] Error al procesar ${subBotDir}: ${e}`);
        }
    }
    
    console.log(`[CLEANUP] Limpieza finalizada. ${cleanedCount} sesiones eliminadas.`);
};

// Se ejecuta la limpieza cada 1 hora
setInterval(cleanup, 60 * 60 * 1000);

// Exportar un handler para que el bot lo cargue, aunque no haga nada en el chat
let handler = async () => {};
handler.tags = ['system'];
handler.command = ['sessioncleanup'];
handler.exp = 0;

export default handler;