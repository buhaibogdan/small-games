var pg = pg || {};
pg.defaults = {
    grid_x: 10,
    grid_y: 10,
    cell_size: 20,
    width: 510,
    height: 210,
    max_planes: 3
};

pg.Plane = function(R) {
    var that = this;
    if (! (this instanceof pg.Plane)) {
        throw new Error("Use the 'new' operator.");
    }
    if (! (R instanceof Raphael)) {
        throw new Error("Invalid parameter R supplied. Must be instance of Raphael function.");
    }
    this.R = R;
    this.countClones = 0;
    this.rotationState = 0;
    var planePath = 'M40,0 L60,0 L60,20 L100,20 L100,40 L60,40 L60,60 L80,60 L80,80 L20,80 L20,60 L40,60 L40,40 L0,40 L0,20 L40,20 L40,0';

    var plane = this.R.path(planePath);
    plane.attr({
        "stroke": "none",
        'fill': '#ae767e',
        transform: "...T270,20  "
    });
    var planeClone = {};
    plane['clearClone'] = function(force) {
        var canClear = !planeClone.hasMoved && planeClone.id;
        if (force === undefined) {
            force = false;
        }
        if (canClear || force) {
            try {
                planeClone.remove();
                that.countClones--;
            } catch (e) {
                console.log(e);
            }

        }
    };

    plane.mouseover(function(e){
        // allow only a fixed amount of planes on the board
        if (that.countClones >= pg.defaults.max_planes) {
            return;
        }
        that.countClones++;
        planeClone = this.clone();
        planeClone.hasMoved = false;
        planeClone.drag(planeCloneMove, planeCloneDragStart, planeCloneDragUp);

    });

    var planeCloneMove = function(dx, dy ) {
        this.transform("...T"+ (dx - this.ox) +','+ (dy - this.oy) );
        this.ox = dx;
        this.oy = dy;
    };

    var planeCloneDragStart = function() {
        this.ox = 0;
        this.oy = 0;
        var bbox = this.getBBox();
        console.log(bbox)
    };

    var planeCloneDragUp = function(e) {
        // if not over area
        // revert drag-and-drop
        var bbox = this.getBBox();
        var field_x_start = 0,
            field_y_start = 0,
            field_x_finish = pg.defaults.cell_size * pg.defaults.grid_x,
            field_y_finish = pg.defaults.cell_size * pg.defaults.grid_y;


        var out_x = bbox.width + bbox.x > field_x_finish;
        var out_y = bbox.height + bbox.y > field_y_finish;
        var before_x = bbox.x < field_x_start;
        var before_y = bbox.y < field_y_start;
        var move_x = bbox.x,
            move_y = bbox.y;
        if (before_x && before_y) {
            move_x = field_x_start;
            move_y = field_y_start;
        } else if (before_x) {
            move_x = field_x_start;
            move_y = bbox.y;
        } else if (before_y) {
            move_x = bbox.x;
            move_y = field_y_start;
        }

        if (out_x || out_y) {
            // remove clone -> dropped outside
            that.countClones--;
            this.remove();
            return;
        }
        this.hasMoved = true;



        // to which corner is it closer?
        // 4 corners possible
        // , limit_start_x, limit_start_y, limit_end_x, limit_end_y
        var get_closest_corner = function(x, y) {
            var corner_top_x = Math.floor(x / 20) * 20;
            var corner_top_y = Math.floor(y / 20) * 20;
            var closest_x = corner_top_x,
                closest_y = corner_top_y;

            if (x-corner_top_x >( corner_top_x+20) - x) {
                closest_x = corner_top_x + 20
            }

            if (y-corner_top_y >( corner_top_y+20) - y) {
                closest_y = corner_top_y + 20
            }
            return {x: closest_x, y: closest_y};

        };
        var move_to = get_closest_corner(move_x, move_y);

        this.transform("t"+move_to.x + ','+move_to.y + 'r'+that.getRotationState());
        //console.log(bbox);
        // TODO: animation here would be nice


        this.ox = 0;
        this.oy = 0;
        planeClone.toFront();
    };

    this.plane = plane;
};
pg.Plane.prototype.getPlaneSVG = function() {
    return this.plane;
};
pg.Plane.prototype.getRotationState = function() {
    return this.rotationState % 4 * 90;
};
pg.Plane.prototype.updateRotationState = function() {
    this.rotationState++;
};

pg.Battlefield = function(config) {
    if (! (this instanceof pg.Battlefield)) {
        throw new Error("Use the 'new' operator.");
    }
    this.offColor = "#d8fffd";
    this.onColor = "#ae767e";
    this.strokeColor = '#86a4a2';
    this.R = new Raphael('field', config.width, config.height);
    this.rotatePath = 'M15.5,5.27c1.914,0,3.666,0.629,5.089,1.686l-1.781,1.783l8.428,2.256l-2.26-8.427l-1.889,1.89C21.016,2.781,18.371,1.77,15.5,1.77C8.827,1.773,3.418,7.181,3.417,13.855c0.001,4.063,2.012,7.647,5.084,9.838v-4.887c-0.993-1.4-1.583-3.105-1.585-4.952C6.923,9.114,10.759,5.278,15.5,5.27zM9.5,29.23h12V12.355h-12V29.23z';

    var items = [], i, j, x, y;

    // create grid
    this.R.setStart();
    for (i=0; i<config.grid_x; i++) {
        for (j=0; j<config.grid_y; j++) {
            x = i * config.cell_size;
            y = j * config.cell_size;
            items.push(
                this.R.rect(x, y, config.cell_size, config.cell_size)
                    .attr("fill", this.offColor)
                    .attr("stroke", this.strokeColor)
                    .click(this.toggleColor)
            );
        }
    }
    this.set = this.R.setFinish();
    // add the rotate plane icon
    var rotate = this.R.path(this.rotatePath);
    rotate.attr({
        "stroke": "none",
        "fill": "grey"
    });
    rotate.transform("T315, 120");
    var plane = new pg.Plane(this.R);
    var planeSVG = plane.getPlaneSVG();
    rotate.click(function(e){
        planeSVG.clearClone();
        planeSVG.transform("...R90");

        plane.updateRotationState();
    });
};

pg.Battlefield.prototype.toggleColor = function() {
    // this.offColor not working here, this is Element
    if (this.attr('fill') === this.offColor) {
        this.attr('fill', this.onColor);
    } else {
        this.attr('fill', this.offColor);
    }
};



(function($, pg){
    $(document).ready(function(){
        window.field = new pg.Battlefield(pg.defaults);
    });
}(jQuery, pg));