console.clear()
console.log('🗣️ Iniciando Naruto Bot...')

import { join, dirname } from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { setupMaster, fork } from 'cluster'
import { watchFile, unwatchFile } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(__dirname)

// Intentar cargar cfonts, si falla continuar
let cfonts
try {
  cfonts = require('cfonts')
  cfonts.say('Naruto ', {
    font: 'block',
    align: 'center',
    gradient: ['cyan', 'magenta'],
    env: 'node'
  })
  cfonts.say('💎 made by NoaDev 💜', {
    font: 'console',
    align: 'center',
    gradient: ['cyan', 'white'],
    env: 'node'
  })
} catch (e) {
  console.log('⚠️ cfonts no instalado, continuando sin estilo.')
}

let isWorking = false

async function launch(scripts) {
  if (isWorking) return
  isWorking = true

  for (const script of scripts) {
    const args = [join(__dirname, script), ...process.argv.slice(2)]

    setupMaster({
      exec: args[0],
      args: args.slice(1),
    })

    let child = fork()

    child.on('exit', (code) => {
      console.log(`⚠️ Proceso terminado con código ${code}`)
      isWorking = false

      // Reinicia siempre que haya error
      if (code !== 0) {
        console.log('🔄 Reiniciando script por fallo...')
        launch(scripts)
      }

      // Observa cambios en el archivo y reinicia
      watchFile(args[0], () => {
        unwatchFile(args[0])
        console.log('🔄 Archivo actualizado, reiniciando...')
        launch(scripts)
      })
    })
  }
}

// Lanza main.js y permite reinicio automático
launch(['main.js'])