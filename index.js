import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { setupMaster, fork } from 'cluster'
import chalk from "chalk"
import http from 'http' // <-- Importamos el módulo web

const __dirname = dirname(fileURLToPath(import.meta.url))
console.log(chalk.green('❤️ Iniciando GataBot en modo Nube (Railway)...'));

// --- TRUCO PARA RAILWAY: Servidor Web Fantasma ---
// Engañamos a Railway abriendo un puerto para que no mate el contenedor
const port = process.env.PORT || 8080;
http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('El servidor fantasma de GataBot esta activo en Railway.\n');
}).listen(port, () => {
    console.log(chalk.blue(`🌐 Servidor fantasma activado en el puerto ${port} para evitar bloqueos.`));
});
// ------------------------------------------------

let isRunning = false

function start(file) {
    if (isRunning) return
    isRunning = true
    
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
        
        if (code === 0 || code === 1) {
            console.log('Reiniciando contenedor de forma segura...');
            start.apply(this, arguments)
        } else {
            console.log('Esperando re-despliegue manual.');
            process.exit(code)
        }
    })
}

start('main.js')
