const express = require('express')
const { createServer } = require("http");
const { resolve } = require('path');
const { Server } = require("socket.io");

const app = express()
const httpServer = createServer(app);

const io = new Server(httpServer);

const loadMap = require('./mapLoader');
const { disconnect } = require('process');

const SPEED = 5
const SNOWBALL_SPEED = 11
const TICK_RATE = 30

const TILE_SIZE = 32

let players = []
let snowballs = []
let ground2D, decal2D
const inputsMap = {}

function isColliding(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.w &&
        rect1.x + rect1.w > rect2.x &&
        rect1.y < rect2.y + rect2.h &&
        rect1.h + rect1.y > rect2.y
    );
}
  
function isCollidingWithMap(player) {
for (let row = 0; row < decal2D.length; row++) {
    for (let col = 0; col < decal2D[0].length; col++) {
    const tile = decal2D[row][col];

    if (
        tile &&
        isColliding(
        {
            x: player.x,
            y: player.y,
            w: 32,
            h: 32,
        },
        {
            x: col * TILE_SIZE,
            y: row * TILE_SIZE,
            w: TILE_SIZE,
            h: TILE_SIZE,
        }
        )
    ) {
        return true;
    }
    }
}
return false;
}

function tick(delta) {
    for (const player of players) {
        const inputs = inputsMap[player.id]
        const previousY = player.y
        const previousX = player.x

        if (inputs.up) {
            player.y -= SPEED
        } else if (inputs.down) {
            player.y += SPEED
        }

        if (isCollidingWithMap(player)) {
            player.y = previousY
        }

        if (inputs.left) {
            player.x -= SPEED
        } else if (inputs.right) {
            player.x += SPEED
        }

        if (isCollidingWithMap(player)) {
            player.x = previousX
        }
    }

    for (const snowball of snowballs) {
        snowball.x += Math.cos(snowball.angle) * SNOWBALL_SPEED
        snowball.y += Math.sin(snowball.angle) * SNOWBALL_SPEED
        snowball.timeLeft -= delta

        for (const player of players) {
            if (player.id === snowball.playerId) continue
            const distance = Math.sqrt((player.x + 8 - snowball.x) ** 2 * (player.y + 8 - snowball.y) ** 2)
            if (distance <= 8) {
                player.x = 0
                player.y = 0
                snowball.timeLeft = -1
                break
            }
        }
    }

    snowballs = snowballs.filter(snowball => snowball.timeLeft >= 0)

    io.emit('players', players)
    io.emit('snowballs', snowballs)
}

async function main() {
    ({ground2D, decal2D} = await loadMap())

    io.on('connect', (socket) => {
        console.log("user connected", socket.id)

        inputsMap[socket.id] = {
            up: false,
            down: false,
            left: false,
            right: false
        }

        players.push({
            id: socket.id,
            x: 800,
            y: 700
        })

        socket.emit('map', {ground: ground2D, decal: decal2D})

        socket.on('inputs', (inputs) => {
            inputsMap[socket.id] = inputs
        })

        socket.on('snowball', (angle) => {
            const player = players.find(player => player.id === socket.id)
            snowballs.push({
                angle,
                x: player.x,
                y: player.y,
                timeLeft: 1000,
                playerId: socket.id
            })
        })

        socket.on('disconnect', () => {
            players = players.filter(player => player.id !== socket.id)
        })
    })
    
    app.use(express.static("public"))
    
    httpServer.listen(5000);

    let lastUpdate = Date.now()
    setInterval(() => {
        const now = Date.now()
        const delta = now - lastUpdate
        tick(delta)
        lastUpdate = now
    }, 1000 / TICK_RATE)
}

main()