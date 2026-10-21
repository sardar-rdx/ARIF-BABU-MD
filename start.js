const fs = require('fs')
const path = require('path')

const projectRoot = __dirname
const dataRoot = process.env.RDX_DATA_DIR

if (dataRoot) {
    const persistentRoot = path.resolve(dataRoot)
    const persistentData = path.join(persistentRoot, 'data')
    const projectData = path.join(projectRoot, 'data')

    fs.mkdirSync(persistentData, { recursive: true })
    fs.mkdirSync(path.join(persistentRoot, 'session'), { recursive: true })

    if (fs.existsSync(projectData) && !fs.lstatSync(projectData).isSymbolicLink()) {
        for (const name of fs.readdirSync(projectData)) {
            const source = path.join(projectData, name)
            const target = path.join(persistentData, name)
            if (!fs.existsSync(target)) {
                fs.cpSync(source, target, { recursive: true, errorOnExist: true })
            }
        }
        fs.rmSync(projectData, { recursive: true, force: true })
    }

    if (!fs.existsSync(projectData)) {
        fs.symlinkSync(persistentData, projectData, 'dir')
    }

    process.env.SESSION_DIR ||= path.join(persistentRoot, 'session')
    process.env.STORE_FILE ||= path.join(persistentRoot, 'baileys_store.json')
}

require('./rdx-engine')
