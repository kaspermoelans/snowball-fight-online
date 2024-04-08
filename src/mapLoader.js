const tmx = require('tmx-parser');

async function loadMap() {
    map = await new Promise((resolve, reject) => {
        tmx.parseFile('./src/map.tmx', function(err, loadedMap) {
            if (err) return reject(err);
            map = loadedMap
            resolve(loadedMap)
        });
    })
    
    const layer = map.layers[0]
    const groundTiles = layer.tiles
    const decalTiles = map.layers[1].tiles
    const ground2D = []
    const decal2D = []
    for (let row = 0; row < map.height; row++) {
        const groundRow = []
        const decalRow = []
        for (let col = 0; col < map.width; col++) {
            const groundTile = groundTiles[row * map.width + col]
            groundRow.push({id: groundTile.id, gid: groundTile.gid})
            const decalTile = decalTiles[row * map.width + col]
            if (decalTile) {
                decalRow.push({id: decalTile.id, gid: decalTile.gid})
            } else {
                decalRow.push(undefined)
            }
        }
        ground2D.push(groundRow)
        decal2D.push(decalRow)
    }
    return {ground2D, decal2D}
}

module.exports = loadMap