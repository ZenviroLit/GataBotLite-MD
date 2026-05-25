import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { setupMaster, fork } from 'cluster'
import chalk from "chalk"

const __dirname = dirname(fileURLToPath(import.meta.url))
console.log(chalk.green('❤️ Iniciando GataBot en modo Nube (Railway)...'));

let isRunning = false

function start(file) {
    if (isRunning) return
    isRunning = true
    
    // Forzamos al sistema a ignorar las descargas de binarios conflictivas
    process.env.NODE_NODE_SKIP_PLATFORM_CHECK = "1"
    
    const args = [join(__dirname, file), ...process.argv.slice(2)]
    setupMaster({
        exec: args[0],
        args: args.slice(1)
    })
    
    const p = fork()
    
    p.on('message', (data) => {
        switch (data) {
            case 'reset':
                p.process.kill()
                isRunning = false
                start.apply(this, arguments)
                break
            case 'uptime':
                p.send(process.uptime())
                break
        }
    })
    
    p.on('exit', (_, code) => {
        isRunning = false;
        console.error('⚠️ CONEXION INTERRUMPIDA >> Código de salida:', code)
        p.process.kill()
        
        // Evitamos bucles infinitos si el contenedor se cae de forma crítica
        if (code === 0 || code === 1) {
            console.log('Reiniciando contenedor de forma segura...');
            start.apply(this, arguments)
        } else {
            console.log('Esperando re-despliegue manual para evitar saturación.');
            process.exit(code)
        }
    })
}

// Saltamos el index tradicional y mandamos a encender el bot directo en el QR
start('main.js')
