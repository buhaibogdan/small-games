var mine = mine || {};
mine.settings = {
    rows: 10,
    cols: 10,
    width: 30,
    height: 30
};

mine.clickedCells = [];
mine.bombs = [];

mine.loadImages = function(callback) {
    // calls a given function when all the required images have been loaded
    var images = {
        cellImg: "images/cell.gif",
        cellClickedImg: "images/cell2.gif",
        bombImg: "images/bomb.gif",
        flagImg: "images/flag.gif",
        qMarkImg: "images/q_mark.gif"
    };
    var countLoaded = 0;
    var execOnLoad = function() {
        countLoaded++;
        if (countLoaded >= 5) {
            callback();
        }
    };
    for (var img in images) {
        if (images.hasOwnProperty(img)) {
            mine[img]  = new Image();
            mine[img].onload = execOnLoad;
            mine[img].src = images[img];
        }
    }
};

mine.init = function () {
    mine.initBombs();

    mine.canvas = document.getElementById("field");
    mine.context = mine.canvas.getContext('2d');
    mine.context.font = "bold 14px sans-serif";

    mine.loadImages(function(){
        mine.draw();
        mine.initEvents();
    });

};

mine.initEvents = function () {
    var getCell = function(e, element) {
        var posX = $(element).position().left,
            posY = $(element).position().top;
        var clk_x = e.pageX - posX,
            clk_y = e.pageY - posY;

        return {
            x: Math.floor(clk_x / mine.settings.width),
            y: Math.floor(clk_y / mine.settings.height)
        };
    };
    $(mine.canvas).on('click', function (e) {
        var cell = getCell(e, this);
        if (mine.clickedCells[cell.x] !== undefined &&
            mine.clickedCells[cell.x][cell.y] !== undefined) {
            return;
        }
        mine.handleBomb(cell.x, cell.y);

    }).on('contextmenu', function(e){
        // flag it
        var cell = getCell(e, this);
        var coordX = cell.x * mine.settings.width,
            coordY = cell.y * mine.settings.height;
        mine.context.drawImage(mine.qMarkImg, coordX, coordY);
        console.log(coordX, coordY);

        return false;
    });
};

mine.handleBomb = function (x, y) {
    if (mine.isBomb(x, y)) {
        mine.endLose();
        return;
    }
    // check around
    stop = 0;
    mine.checkForBombsAround(x, y);
};
var stop = 0;
mine.checkForBombsAround = function (x, y) {
    stop++;
    if (stop > 510) {
        throw new Error("too much!!!!!!")
    }
    var cellsAround = [
        [-1, -1],
        [0, -1],
        [1, -1],
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 1],
        [-1, 0]
    ];
    var numBombsAround = 0, i, j,
        numBombs = mine.bombs.length,
        numCellsAround = cellsAround.length;

    for (i = 0; i < numCellsAround; i++) {
        for (j = 0; j < numBombs; j++) {
            if (mine.bombs[j][0] == (cellsAround[i][0] + x) &&
                mine.bombs[j][1] == (cellsAround[i][1] + y)
                ) {
                numBombsAround++;
            }
        }
    }
    mine.clickedCells[x] = mine.clickedCells[x] || {};
    mine.clickedCells[x][y] = numBombsAround;
    // add to clicked cells
    if (numBombsAround === 0) {
        for (i = 0; i < numCellsAround; i++) {
            var nextX = x + cellsAround[i][0],
                nextY = y + cellsAround[i][1];
            if (mine.isClicked(nextX, nextY)) {
                continue;
            }
            if (nextX >= 0 && nextY >= 0 && nextX < mine.settings.cols && nextY < mine.settings.rows) {
                mine.checkForBombsAround(nextX, nextY);
            }


        }

    }

    mine.draw();
};

mine.isClicked = function(x, y) {
    return mine.clickedCells[x] !== undefined &&
        mine.clickedCells[x][y] !== undefined
};

mine.isBomb = function (x, y) {
    var i, len = mine.bombs.length;

    for (i = 0; i < len; i++) {
        if (mine.bombs[i][0] === x && mine.bombs[i][1] === y) {
            return true;
        }
    }
    return false;
};

mine.endLose = function () {
    console.log('KO');
};

mine.endWin = function () {
    console.log("========================");
    console.log("======= YOU WIN ========");
    console.log("========================");
};

mine.draw = function () {
    mine.context.clearRect(0, 0, 400, 400);
    var i, j, x, y, cell;
    for (i = 0; i < mine.settings.cols; i++) {
        for (j = 0; j < mine.settings.rows; j++) {
            x = mine.settings.width * i;
            y = mine.settings.height * j;
            cell = {
                x: x / 30,
                y: y / 30
            };
            if (mine.isBomb(cell.x, cell.y)) {
                mine.context.drawImage(mine.bombImg, x, y);
            } else {
                if (mine.isClicked(cell.x, cell.y)) {
                    mine.context.drawImage(mine.cellClickedImg, x, y);
                    mine.context.fillText(mine.clickedCells[cell.x][cell.y], x + 8, y + mine.settings.height - 8);
                } else {
                    mine.context.drawImage(mine.cellImg, x, y);
                }

            }

        }
    }
};


mine.bombExists = function (bomb) {
    var numBombs = mine.bombs.length,
        j;
    for (j = 0; j < numBombs; j++) {
        if (bomb[0] === mine.bombs[j][0] && bomb[1] === mine.bombs[j][1]) {
            return true;
        }
    }
    return false;
};

mine.initBombs = function () {
    var i = 0;
    while (i < mine.settings.cols) {
        var bomb = [
            Math.floor(Math.random() * mine.settings.cols),
            Math.floor(Math.random() * mine.settings.cols)
        ];

        if (mine.bombExists(bomb)) {
            continue;
        }
        mine.bombs.push(bomb);
        i++;
    }
    console.log(mine.bombs)
};

(function ($) {


    $(document).ready(function () {
        mine.init()


    });
}(jQuery));