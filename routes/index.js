
/*
 * GET home page.
 */

exports.index = function(req, res){
    res.render('index', { title: 'Planes Game' });
};

exports.mine = function(req, res) {
    res.render('mine', {title: 'minesweeper'});
};