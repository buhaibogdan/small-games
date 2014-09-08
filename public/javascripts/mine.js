var mine = mine || {};
mine.settings = {
    rows: 10,
    cols: 10,
    width: 30,
    height: 30
};

mine.cellsHidden = mine.settings.rows * mine.settings.cols;
mine.clickedCells = {};
mine.rClicked = {};
mine.bombs = [];
// right click states
mine.DEFAULT = 'cellImg';
mine.FLAGGED = 'flagImg';
mine.UNKNOWN = 'unknownImg';

mine.loadImages = function(callback) {
    // calls a given function when all the required images have been loaded
    var images = {
        cellImg: "images/cell.gif",
        cellClickedImg: "images/cell2.gif",
        bombImg: "images/bomb.gif",
        flagImg: "images/flag.gif",
        unknownImg: "images/q_mark.gif"
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

mine.restart = function() {
    mine.cellsHidden = mine.settings.rows * mine.settings.cols;
    mine.clickedCells = {};
    mine.rClicked = {};
    mine.bombs = [];
    mine.flag.count = null;
    mine.clearEvents();
    mine.init();
};

mine.init = function () {
    mine.initBombs();
    mine.timer.reset();
    mine.canvas = document.getElementById("field");
    mine.context = mine.canvas.getContext('2d');
    mine.context.font = "bold 20px sans-serif";

    mine.loadImages(function(){
        mine.draw();
        mine.initEvents();
        mine.flag.updateView();
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
        mine.timer.start();
        var cell = getCell(e, this);

        if (mine.flag.isFlagged(cell.x, cell.y)) {
            return;
        }

        if (mine.clickedCells[cell.x] !== undefined &&
            mine.clickedCells[cell.x][cell.y] !== undefined) {
            return;
        }
        mine.handleBomb(cell.x, cell.y);
        mine.checkWin();

    }).on('contextmenu', function(e){
        // flag it
        var cell = getCell(e, this);
        var coordX = cell.x * mine.settings.width,
            coordY = cell.y * mine.settings.height;

        var key = mine.flag.getKey(cell.x, cell.y);
        mine.flag.updateFlagState(key);
        mine.context.drawImage(mine[mine.rClicked[key]], coordX, coordY);
        mine.checkWin();

        return false;
    });
};


mine.clearEvents = function() {
    $(mine.canvas).off('click').off('contextmenu');
};

mine.revealBombs = function() {
    mine.draw(true);
};

// ========================================
// ================ FLAGS =================
// ========================================
mine.flag = {};
mine.flag.getKey = function(x, y) {
    return x + '-' + y;
};

mine.flag.updateFlagState = function(key) {
    var flagState;
    switch (mine.rClicked[key]){
        case mine.DEFAULT:
            mine.rClicked[key] = mine.FLAGGED;
            flagState = -1;
            break;
        case mine.FLAGGED:
            mine.rClicked[key] = mine.UNKNOWN;
            flagState = 1;
            break;
        case mine.UNKNOWN:
            mine.rClicked[key] = mine.DEFAULT;
            flagState = 0;
            break;
        default:
            mine.rClicked[key] = mine.FLAGGED;
            flagState = -1;
    }
    mine.flag.updateView(flagState);
};

mine.flag.count = null;
mine.flag.updateView = function(state) {
    if (mine.flag.count === null) {
        // enter here when initializing the field
        mine.flag.count = mine.bombs.length;
    }
    if (state === -1) {
        mine.flag.count--;
    } else if (state === 1) {
        mine.flag.count++;
    }

    $('#flags').text(mine.flag.count)
};
mine.flag.isFlagged = function(x, y) {
    return mine.rClicked[mine.flag.getKey(x, y)] === mine.FLAGGED;
};
// ========================================
// ========================================

mine.handleBomb = function (x, y) {
    if (mine.isBomb(x, y)) {
        mine.endLose();

        return;
    }
    // check around
    mine.reccursionSafety = 0;
    mine.checkForBombsAround(x, y);
};

mine.reccursionSafety = 0;
mine.checkForBombsAround = function (x, y) {
    mine.reccursionSafety++;
    if (mine.reccursionSafety > 510) {
        throw new Error("too much recursion!")
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
    mine.cellsHidden--;
    // add to clicked cells
    if (numBombsAround === 0) {
        for (i = 0; i < numCellsAround; i++) {
            var nextX = x + cellsAround[i][0],
                nextY = y + cellsAround[i][1];
            if (mine.isClicked(nextX, nextY)) {
                continue;
            }
            if (mine.flag.isFlagged(nextX, nextY)) {
                return;
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
    mine.endGame();
    mine.revealBombs();
    // no score should be recorded
    alert("BOOM!");
};
mine.endGame = function() {
    mine.clearEvents();
    return mine.timer.stop();
};

mine.checkWin = function() {
    var i,
        numBombs = mine.bombs.length;
    if (0 !== mine.flag.count) {
        // not enough flags -> too many or too little
        return;
    }

    if (mine.cellsHidden !== numBombs) {
        // unopened cells
        return;
    }

    for (i=0; i<numBombs; i++) {
        if (!mine.flag.isFlagged(mine.bombs[i][0], mine.bombs[i][1])) {
            return;
        }
    }
    // hurray!!
    mine.endWin();
};

mine.endWin = function () {
    var score = mine.endGame();
    // send status to server to store
    // display
    var msg = "Congrats! You revealed all the bombs in " + score + ' seconds.';
    alert(msg);
    console.log("========================");
    console.log("======= YOU WIN ========");
    console.log("========================");
};

mine.getColor = function(numBombs) {
    var color = "blue";
    if (numBombs === 2) {
        color = "green";
    } else if (numBombs > 2) {
        color = "red"
    }
    return color;
};

mine.draw = function (showBombs) {
    //showBombs = true;
    mine.context.clearRect(0, 0, 400, 400);
    var i, j, x, y, cell, numBombs;
    for (i = 0; i < mine.settings.cols; i++) {
        for (j = 0; j < mine.settings.rows; j++) {
            x = mine.settings.width * i;
            y = mine.settings.height * j;
            cell = {
                x: x / 30,
                y: y / 30
            };
            if (showBombs && mine.isBomb(cell.x, cell.y)) {
                mine.context.drawImage(mine.bombImg, x, y);
            } else {
                if (mine.isClicked(cell.x, cell.y)) {
                    numBombs = mine.clickedCells[cell.x][cell.y];
                    mine.context.drawImage(mine.cellClickedImg, x, y);
                    mine.context.fillStyle = mine.getColor(numBombs);
                    mine.context.fillText(mine.clickedCells[cell.x][cell.y], x + 9, y + mine.settings.height - 8);
                } else if (mine.flag.isFlagged(cell.x, cell.y)) {
                    var img = mine.rClicked[mine.flag.getKey(cell.x, cell.y)];
                    mine.context.drawImage(mine[img], x, y);
                }
                else {
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
};

// ========================================
// ================ TIMER =================
// ========================================
mine.timer = {};
mine.timer.interval = null;
mine.timer.time = 0;
mine.timer.start = function() {
    if (mine.timer.interval) {
        return;
    }
    var incrementTimer = function() {
        mine.timer.time++;
        $('#timer').text(mine.timer.time);
    };
    incrementTimer();
    mine.timer.interval = setInterval(function(){
        incrementTimer();
    }, 1000);
};
// ========================================
// ========================================
mine.timer.stop = function() {
    clearInterval(mine.timer.interval);
    return mine.timer.time;
};

mine.timer.reset = function() {
    mine.timer.stop();
    $('#timer').text(0);
    mine.timer.time = 0;
    mine.timer.interval = null;
};

(function ($) {


    $(document).ready(function () {
        mine.init();
        $('#ctrl-retry, #ctrl-new').click(function(e) {
            e.preventDefault();
            mine.restart();
        });

    });
}(jQuery));