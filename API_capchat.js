var express = require('express');
var bodyParser = require('body-parser');
const cors = require('cors')
const port = 3000
var mysql = require('mysql');

var app = express();
app.use(cors())
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));

var sql = mysql.createConnection({
    socketPath : '/Applications/MAMP/tmp/mysql/mysql.sock',
    host: "localhost",
    user: "root",
    password: "root",
    database: "Capchat"
});  

sql.connect();

app.post('/connexion', async function (req, res) {
  const users = await getUsers();
  const user = users.find(u => u.nom == req.body.username && u.mdp == hash(req.body.password.toString()));
  if (!user) {
      return res.status(400).json({
          message: `le nom d'utilisateur ou le mot de passe sont incorrect`
      })
  }
  const token = jwt.sign({id: user.id, username: req.body.username }, process.env.SECRET_TOKEN, { expiresIn: '12h' });
  return res.send({ token: token })
})

app.post('/inscription', async function (req, res) {
  const users = await getUsers();
  const user = users.find(u => u.nom == req.body.username);
  if (user) {
      res.status(400).json({
          message: `L'utilisateur ${req.body.username} existe déjà`
      })
  }
})


app.listen(port, () => {
  console.log(`http://localhost:${port}`)
})
await setUser(req.body.username, req.body.password)
        .then(
            data => {
                const token = jwt.sign({id: data.insertId ,username: req.body.username }, process.env.SECRET_TOKEN, { expiresIn: '12h' });
                res.send({
                    message: `Le compte ${req.body.username} à été créé avec succès`,
                    token: token
                });
            }
        )
        .catch(
            err => {
                return res.status(400).json({
                    message: `erreur : ${err}`
                });
            }
        );

app.get('/compte', authenticateToken, function(req, res) {
    const token = req.headers.authorization && extractBearerToken(req.headers.authorization)
    const decoded = jwt.decode(token, {
        complete: false
    })
    res.json({
        content: decoded
    })
})

app.get('/Capchat/:idJeu', authenticateToken, async function(req, res) {
    await getCapchat(req.params.idJeu)
    .then(
        data => {
            const reponse = convertBuffObjectToString(data[0]);
            const imageSing = convertBuffObjectToString(data[1]);
            reponse[Math.floor(Math.random() * 8)] = imageSing[0];
            
            for (let i = 0; i < reponse.length; i++) {
                reponse[i].ordre = i + 1              
            }
            res.json(reponse);
        }
    )
    .catch(
        err => {
            res.status(400).json(err);
        }
    )
})

app.get('/getJeu', authenticateToken, async function(req, res) {
    const decoded = getIdUser(req);
    await getJeu(decoded.id)
    .then(
        data => {
            return res.json(data)
        }
    )
    .catch(
        err => {
            return res.status(400).json(err)
        }
    )
})

app.post('/sendJeu', authenticateToken, async function(req, res) {
    const decoded = getIdUser(req)
    await setJeu(req.body.nom, decoded.id, req.body.theme)
    .then(
        () => {
            return res.status(200).end();
        }
    )
    .catch(
        err => {
            return res.status(400).json(err);
        }
    )
})

app.delete('/deleteJeu/:id', authenticateToken, async function(req, res) {
    await deleteJeu(req.params.id)
    .then(
        () => {
            return res.status(200).end();
        }
    )
    .catch(
        err => {
            return res.status(400).json(err)
        }
    )
})

app.get('/themes', authenticateToken, async function(req, res) {
    await getThemes()
    .then(
        data => {
            return res.json(data);
        }
    )
    .catch(
        err => {
            return res.status(400).json(err);
        }
    )
})

app.get('/getDessin/:idJeu', authenticateToken, async function(req, res) {
    const decoded = getIdUser(req);
    await getDessin(req.params.idJeu, decoded.id)
    .then(
        data => {
            const reponse = convertBuffObjectToString(data);
            res.json(reponse);
        }
    )
    .catch(
        err => {
            return res.status(400).json(err);
        }
    )
})

app.post('/setDessin', authenticateToken, async function(req, res) {
    if (!req.files) {
        return res.status(400).end();
    }
    const dessin = req.files.dessin.data.toString('base64');
    await setDessin(dessin, req.files.dessin.mimetype, req.body.texteQuestion, req.body.imageSinguliere, req.body.idJeu)
    .then(
        () => {
            return res.status(200).end();
        }
    )
    .catch(
        err => {
            return res.status(400).json(err);
        }
    )
})

app.delete('/deleteDessin/:id', authenticateToken, async function(req, res) {
    await deleteDessin(req.params.id)
    .then(
        () => {
            return res.status(200).end();
        }
    )
    .catch(
        err => {
            return res.status(400).json(err);
        }
    )
})

app.post('/testsendimg', authenticateToken, async function(req, res) {
    if (!req.files) {
        return res.status(400).end();
    }
    await setImg(req.files.img.data.toString('base64'), req.files.img.mimetype)
        .then(
            () => {
                return res.status(200).end();
            }
        )
        .catch(
            err => {
                return res.status(400).json({
                    message: `erreur : ${err}`
                })
            }
        )
})

app.get('/testgetimg', authenticateToken, async function(req, res) {
    await getImg()
        .then(
            data => {
                const reponse = convertBuffObjectToString(data);
                res.json(reponse);
            }
        )
        .catch(
            err => {
                return res.status(400).json(err);
            }
        )
})

function getIdUser(req) {
    const token = req.headers.authorization && extractBearerToken(req.headers.authorization)
    const decoded = jwt.decode(token, {
        complete: false
    })
    return decoded
}

function convertBuffObjectToString(data) {
    for (let i = 0; i < data.length; i++) {
        data[i].img = data[i].img.toString();
    }
    return data
}

function getCapchat(idJeu) {
    return new Promise((resolve, reject) => {
        sql.query(`
        SELECT img, format, TexteQuestion, ImageSinguliere FROM image WHERE idJeu = ${idJeu} AND imageSinguliere = 0 ORDER BY RAND() LIMIT 9;
        SELECT img, format, TexteQuestion, ImageSinguliere FROM image WHERE idJeu = ${idJeu} AND imageSinguliere = 1 ORDER BY RAND() LIMIT 1;
        `, function(err, rows) {
            if (err) return reject(err)
            return resolve(rows);
        })
    })
}

function getJeu(id) {
    return new Promise((resolve, reject) => {
        sql.query(
            `SELECT jeu.id AS id, jeu.nom AS jeu, theme.nom AS theme
            FROM jeu 
            INNER JOIN theme ON jeu.IdTheme = theme.id 
            WHERE jeu.IdArtiste = ${id} 
            ORDER BY jeu.id DESC`
        , function(err, rows) {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

function setJeu(nom, artiste, theme) {
    return new Promise((resolve, reject) => {
        const token = crypto.randomBytes(8).toString('hex');
        sql.query(`INSERT INTO jeu (nom, token, idArtiste, idTheme) VALUES ('${nom}', '${token}', ${artiste}, ${theme})`, function(err) {
            if (err) return reject(err);
            return resolve();
        })
    })
}

function deleteJeu(id) {
    return new Promise((resolve, reject) => {
        sql.query(`
        DELETE FROM image WHERE idJeu = ${id};
        DELETE FROM jeu WHERE jeu.id = ${id};`, function(err) {
            if (err) return reject(err);
            return resolve();
        })
    })
}

function getThemes() {
    return new Promise((resolve, reject) => {
        sql.query('SELECT * FROM theme', function(err, rows) {
            if (err) reject(err);
            return resolve(rows);
        })
    })
}

function getDessin(idJeu, idArtiste) {
    return new Promise((resolve, reject) => {
        sql.query(`
            SELECT image.id AS id, img, format, TexteQuestion, ImageSinguliere, IdJeu FROM image 
            INNER JOIN jeu ON image.IdJeu = jeu.id
            WHERE jeu.IdArtiste = ${idArtiste}
            AND IdJeu = ${idJeu}
            ORDER BY image.id DESC
        `, function(err, rows) {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

function setDessin(img, format, TexteQuestion, ImageSinguliere, idJeu) {
    return new Promise((resolve, reject) => {
        sql.query(`
            INSERT INTO image (img, format, TexteQuestion, ImageSinguliere, IdJeu) 
            VALUES ('${img}', '${format}', "${TexteQuestion}", ${ImageSinguliere}, ${idJeu})
            `, function (err,) {
            if (err) return reject(err);
            return resolve();
        })
    })
}

function deleteDessin(id) {
    return new Promise((resolve, reject) => {
        sql.query(`
            DELETE FROM image WHERE id = ${id}
        `, function(err) {
            if(err) return reject(err);
            return resolve();
        })
    })
}

function setImg(img, format) {
    return new Promise((resolve, reject) => {
        sql.query(`INSERT INTO testimg (img, format) VALUES ('${img}', '${format}')`, function (err,) {
            if (err) return reject(err);
            return resolve();
        })
    })
}

function getImg() {
    return new Promise((resolve, reject) => {
        sql.query('SELECT * FROM testimg ORDER BY id DESC', function (err, rows) {
            if (err) return reject(err);
            return resolve(rows)
        })
    })
}

// verifie le token de l'utilisateur
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) return res.status(401).json({
        message: 'Erreur : token manquant'
    })

    jwt.verify(token, process.env.SECRET_TOKEN, (err, user) => {
        if (err) return res.status(403).json({
            message: `Erreur : ${err}`
        })
        req.user = user
        next()
    })
}

// function 

function extractBearerToken(headerValue) {
    if (typeof headerValue !== 'string') {
        return false
    }

    const matches = headerValue.match(/(bearer)\s+(\S+)/i)
    return matches && matches[2]
}

function getUsers() {
    return new Promise((resolve, reject) => {
        sql.query('SELECT id, nom, mdp FROM artiste', function (err, rows) {
            if (err) return reject(err)
            return resolve(rows);
        })
    })
}

function setUser(nom, mdp) {
    return new Promise((resolve, reject) => {
        sql.query(`INSERT INTO artiste(nom, mdp) VALUES ('${nom}','${hash(mdp.toString())}')`, function (err, rows) {
            if (err) return reject(err);
            return resolve(rows);
        })
    })
}

function hash(mdp) {
    return crypto.createHmac('sha512', process.env.SECRET_TOKEN_MDP).update(mdp).digest('hex').toString();
}

app.listen(port, () => {
    var address,
        ifaces = require('os').networkInterfaces();
    for (var dev in ifaces) {
        ifaces[dev].filter((details) => details.family === 'IPv4' && details.internal === false ? address = details.address : undefined);
    }
    console.log(`-Local: http://localhost:${port}/\n-Network: http://${address}:${port}/`);
})
