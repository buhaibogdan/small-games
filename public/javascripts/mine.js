// Functionality for the minesweeper game

(function ($) {
    var mine = mine || {};
    mine.settings = {
        rows: 9,
        cols: 9,
        width: 30,
        height: 30,
        bombs: 10
    };
    mine.difficulty = {
        'easy': {
            rows: 9,
            cols: 9,
            bombs: 9
        },
        'normal': {
            rows: 15,
            cols: 15,
            bombs: 16
        },
        'hard': {
            rows: 15,
            cols: 30,
            bombs: 90
        }
    };

    mine.lastUsedSettings = mine.difficulty.normal;
    mine.cellsHidden = mine.settings.rows * mine.settings.cols;
    mine.clickedCells = {};
    mine.rClicked = {};
    mine.bombs = [];
    // right click states
    mine.DEFAULT = 'cellImg';
    mine.FLAGGED = 'flagImg';
    mine.UNKNOWN = 'unknownImg';
    mine.bombExploded = null;

    var debug = {bombs: [
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
        [0, 5],
        [0, 0]
    ]};

    mine.loadImages = function (callback) {
        // calls a given function when all the required images have been loaded
        var images = {
            cellImg: "images/cell.gif",
            cellClickedImg: "images/cell2.gif",
            bombImg: "images/bomb.gif",
            flagImg: "images/flag.gif",
            unknownImg: "images/q_mark.gif"
        };
        var countLoaded = 0;
        var execOnLoad = function () {
            countLoaded++;
            if (countLoaded >= 5) {
                callback();
            }
        };
        for (var img in images) {
            if (images.hasOwnProperty(img)) {
                mine[img] = new Image();
                mine[img].onload = execOnLoad;
                mine[img].src = images[img];
            }
        }
    };

    mine.restart = function (difficulty) {
        mine.clickedCells = {};
        mine.rClicked = {};
        mine.bombs = [];
        mine.flag.count = null;
        mine.bombExploded = null;
        mine.clearEvents();
        mine.init(difficulty);
        mine.cellsHidden = mine.settings.rows * mine.settings.cols;
    };

    mine.init = function (difficulty) {
        mine.canvas = document.getElementById("field");
        mine.context = mine.canvas.getContext('2d');

        mine.initSettings(difficulty);
        mine.initBombs();
        mine.timer.reset();

        mine.loadImages(function () {
            mine.draw.all();
            mine.initCanvasEvents();
            mine.flag.updateView();
        });
    };

    mine.initSettings = function (difficulty) {
        $.extend(mine.settings, difficulty);
        var canvasHeight = mine.settings.rows * mine.settings.height + 10,
            canvasWidth = mine.settings.cols * mine.settings.width + 10;
        $(mine.canvas).attr('width', canvasWidth);
        $(mine.canvas).attr('height', canvasHeight);

        mine.lastUsedSettings = mine.settings
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
        while (i < mine.settings.bombs) {
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

    mine.initCanvasEvents = function () {
        var getCell = function (e, element) {
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

        }).on('contextmenu', function (e) {
            // flag it
            var cell = getCell(e, this);
            if (mine.isClicked(cell.x, cell.y)) {
                // can't flag discovered cells
                return;
            }
            var coordX = cell.x * mine.settings.width,
                coordY = cell.y * mine.settings.height;

            var key = mine.flag.getKey(cell.x, cell.y);
            mine.flag.updateFlagState(key);
            mine.context.drawImage(mine[mine.rClicked[key]], coordX, coordY);
            mine.checkWin();

            return false;
        });
    };


    mine.clearEvents = function () {
        $(mine.canvas).off('click').off('contextmenu');
    };

    mine.revealBombs = function () {
        mine.draw.all(true);
    };

    // ========================================
    // ================ FLAGS =================
    // ========================================
    mine.flag = {};
    mine.flag.getKey = function (x, y) {
        return x + '-' + y;
    };

    mine.flag.updateFlagState = function (key) {
        var flagState;
        switch (mine.rClicked[key]) {
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
    mine.flag.updateView = function (state) {
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
    mine.flag.isFlagged = function (x, y) {
        return mine.rClicked[mine.flag.getKey(x, y)] === mine.FLAGGED;
    };
    // ========================================
    // ========================================

    mine.handleBomb = function (x, y) {
        if (mine.isBomb(x, y)) {
            mine.endLose(x, y);

            return;
        }
        // check around
        mine.reccursionSafety = 0;
        mine.checkForBombsAround(x, y);
        mine.draw.all();
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
    };

    mine.isClicked = function (x, y) {
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

    mine.endLose = function (x, y) {
        mine.bombExploded = [x, y];
        mine.endGame();
        mine.revealBombs();
        // no score should be recorded
        mine.events.showEndGameModal()
    };
    mine.endGame = function () {
        mine.clearEvents();
        return mine.timer.stop();
    };

    mine.checkWin = function () {
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

        for (i = 0; i < numBombs; i++) {
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
        mine.events.showEndGameModal(score, true);
    };

    mine.getColor = function (numBombs) {
        var color = "blue";
        if (numBombs === 2) {
            color = "green";
        } else if (numBombs > 2) {
            color = "red"
        }
        return color;
    };

    mine.draw = {};
    mine.draw.all = function (showBombs) {
        //showBombs = true;
        mine.context.clearRect(0, 0, 1000, 1000);
        var i, j, x, y, cell;
        for (i = 0; i < mine.settings.cols; i++) {
            for (j = 0; j < mine.settings.rows; j++) {
                x = mine.settings.width * i;
                y = mine.settings.height * j;
                cell = {
                    x: x / mine.settings.width,
                    y: y / mine.settings.height
                };

                mine.draw.cell(cell, x, y, showBombs);
            }
        }
        // highlight the clicked bomb if any
        mine.draw.highlightExploded(showBombs)
    };

    mine.draw.cell = function(cellXY, x, y, showBombs) {
        // draw a single cell
        var img;
        if (showBombs && mine.isBomb(cellXY.x, cellXY.y)) {
            // draw a bomb
            mine.draw.bombs(x, y, cellXY);
            return;
        }

        if (mine.isClicked(cellXY.x, cellXY.y)) {
            // write the number of surrounding bombs
            mine.draw.writeNormal(
                mine.clickedCells[cellXY.x][cellXY.y], x, y, mine.clickedCells[cellXY.x][cellXY.y]
            );
            return;
        }

        if (!mine.flag.isFlagged(cellXY.x, cellXY.y)) {
            // undiscovered cell
            mine.context.drawImage(mine.cellImg, x, y);
            return;
        }

        if (showBombs && !mine.isBomb(cellXY.x, cellXY.y)) {
            // cell marked as bomb but not actually a bomb
            mine.context.drawImage(mine.cellImg, x, y);
            mine.draw.writeBigX(x, y);
        } else {
            // draw flag or question mark
            img = mine.rClicked[mine.flag.getKey(cellXY.x, cellXY.y)];
            mine.context.drawImage(mine[img], x, y);
        }
    };

    mine.draw.bombs = function(x, y, cell) {
        if (mine.flag.isFlagged(cell.x, cell.y)) {
            mine.context.globalAlpha = 0.6;
        }
        mine.context.drawImage(mine.bombImg, x, y);
        mine.context.globalAlpha = 1;
    };

    mine.draw.writeNormal = function (val, x, y, numBombs) {
        mine.context.font = "bold 20px sans-serif";
        mine.context.drawImage(mine.cellClickedImg, x, y);

        mine.context.fillStyle = this.getColor(numBombs);
        mine.context.fillText(val, x + 9, y + mine.settings.height - 8);
    };

    mine.draw.getColor = function (numBombs) {
        var color = "blue";
        if (numBombs === 2) {
            color = "green";
        } else if (numBombs > 2) {
            color = "red"
        }
        return color;
    };

    mine.draw.writeBigX = function(x, y) {
        mine.context.font = "52px sans-serif";
        mine.context.fillStyle = 'red';
        mine.context.fillText('x', x + 1, y + mine.settings.height);
    };

    mine.draw.highlightExploded = function(showBombs) {
        if (showBombs && mine.bombExploded) {
            mine.context.strokeStyle = 'black';
            mine.context.lineWidth = 2;
            mine.context.strokeRect(
                    mine.settings.width * mine.bombExploded[0], // x
                    mine.settings.height * mine.bombExploded[1], // y
                mine.settings.width,
                mine.settings.height
            );
        }
    };


    // ========================================
    // ================ TIMER =================
    // ========================================
    mine.timer = {};
    mine.timer.interval = null;
    mine.timer.time = 0;
    mine.timer.start = function () {
        if (mine.timer.interval) {
            return;
        }
        var incrementTimer = function () {
            mine.timer.time++;
            $('#timer').text(mine.timer.time);
        };
        incrementTimer();
        mine.timer.interval = setInterval(function () {
            incrementTimer();
        }, 1000);
    };
    // ========================================
    // ========================================
    mine.timer.stop = function () {
        clearInterval(mine.timer.interval);
        return mine.timer.time;
    };

    mine.timer.reset = function () {
        mine.timer.stop();
        $('#timer').text(0);
        mine.timer.time = 0;
        mine.timer.interval = null;
    };

    mine.events = {};

    mine.events.showEndGameModal = function (timer, won) {
        var modal = $('#endgame'),
            winMsg = $('#win_msg'),
            loseMsg = $('#lose_msg'),
            timeMsg = $('#finish_time');
        if (won) {
            winMsg.show();
            loseMsg.hide();
            timeMsg.text(timer)
        } else {
            winMsg.hide();
            loseMsg.show();
        }
        modal.modal()
    };

    mine.events.initNewGameModal = function () {
        var modal = $('#newgame'),
            ctrlRetry = $('#ctrl-retry'),
            ctrlNew = $('#ctrl-new'),
            diffBtns = $('#diff_easy, #diff_normal, #diff_hard');

        ctrlRetry.on('click', function (e) {
            e.preventDefault();
            mine.restart(mine.lastUsedSettings);
        });

        ctrlNew.on('click', function (e) {
            e.preventDefault();

            modal.modal();
            $('#play_new_game').on('click', function (e) {
                var difficulty = $('input[name=difficulty]:checked', '#default_difficulty').val();
                mine.restart(mine.difficulty[difficulty]);
                modal.modal('hide')
            });
        });

        diffBtns.on('click', function (e) {
            e.preventDefault();
            var difficulty = $(this).attr('data-diff');
            mine.restart(mine.difficulty[difficulty]);
            modal.modal('hide')
        });
    };

    $(document).ready(function () {
        mine.init(mine.difficulty.easy);
        mine.events.initNewGameModal();
    });
}(jQuery));
