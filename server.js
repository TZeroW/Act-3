const express = require('express');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'HolaMundo';
const DATA_FILE = 'tareas.json';
const USERS_FILE = 'usuarios.json';

app.use(express.json());

async function leerArchivo(archivo) {
    try {
        const data = await fs.readFile(archivo, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

async function guardarArchivo(archivo, datos) {
    await fs.writeFile(archivo, JSON.stringify(datos, null, 2));
}

function autenticarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ mensaje: 'Acceso denegado: TOKEN no proporsionado' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ mensaje: 'TOKEN invalido o expirao' });
        req.user = user;
        next();
    });
}

app.post('/register', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).send('Faltan datos lol');

        const usuarios = await leerArchivo(USERS_FILE);
        const hashedPassword = await bcrypt.hash(password, 10);

        const nuevoUsuario = { id: Date.now(), username, password: hashedPassword };
        usuarios.push(nuevoUsuario);

        await guardarArchivo(USERS_FILE, usuarios);
        res.status(201).json({ mensaje: 'Usuario registrado felicidades' })
    } catch (error) {
        next(error);
    }
});

app.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const usaurios = await leerArchivo(USERS_FILE);
        const usuario = usaurios.find(u => u.username === username);

        if (usuario && await bcrypt.compare(password, usuario.password)) {
            const token = jwt.sign({ username: usuario.username }, SECRET_KEY, { expiresIn: '1h' });
            res.json({ token })
        } else {
            res.status(401).send('Credenciales incorrectas ingrese las correctas')
        }
    } catch (error) {
        next(error);
    }
});

app.get('/tareas', autenticarToken, async (req, res, next) => {
    try {
        const tareas = await leerArchivo(DATA_FILE);
        res.json(tareas);
    } catch (error) {
        next(error);
    }
});

app.post('/tareas', autenticarToken, async (req, res, next) => {
    try {
        const { titulo, descripcion } = req.body;
        if (!titulo || !descripcion) return res.status(400).send('Se necesita un titulo y una descripcio porfas');

        const tareas = await leerArchivo(DATA_FILE);
        const nuevaTarea = { id: Date.now(), descripcion };

        tareas.push(nuevaTarea);
        await guardarArchivo(DATA_FILE, tareas);
        res.status(201).json(nuevaTarea);
    } catch (error) {
        next(error);
    }
});

app.put('/tareas/:id', autenticarToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { titulo, descripcion } = req.body;
        let tareas = await leerArchivo(DATA_FILE);

        const index = tareas.findIndex(t => t.id == id);
        if (index === -1) return res.status(404).send('No se encotro la tarea');

        tareas[index] = { ...tareas[index], titulo, descripcion };
        await guardarArchivo(DATA_FILE, tareas);
        res.json(tareas[index]);
    } catch (error) {
        next(error);
    }
});

app.delete('/tareas/:id', autenticarToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        let tareas = await leerArchivo(DATA_FILE);

        const nuevasTareas = tareas.filter(t => t.id != id);
        if (tareas.length === nuevasTareas.length) return res.status(400).send('No se encontro la tarea');

        await guardarArchivo(DATA_FILE, nuevasTareas);
        res.send('Tarea Eliminada con exito');
    } catch (error) {
        next(error);
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Upss algo salio mal nimodo', detalle: err.message });
});

app.listen(PORT, () => {
    console.log(`El servidor esta corriendo en http://localhost:${PORT}`);
});


