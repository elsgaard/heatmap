
var gg = {
    timeMin: 0,
    timeMax: 0,
    valueMin: 0,
    valueMax: 0,
    yBinSize: 0,
    xBinSize: 0,
    timeInterval: 0,
    graphWidth: 1400,
    graphHeight: 400,
    graphMargin: 50,
    margin: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
    },
    gDJson: {}
}


function bin(g) {
    var bins = [];

    g.gDJson.map(function (d, index) {
        x = g.xBinSize * parseInt((d.time - g.timeMin - 1) / g.xBinSize);
        y = g.yBinSize * parseInt(d.value / g.yBinSize);

        var inIdx = alreadyIn(x, y, bins);

        if (!inIdx) {
            bins.push({
                x: x,
                y: y,
                count: 1
            });
        }
        else {
            ++bins[inIdx].count;
        }
    });

    return (bins);
}

function alreadyIn (x, y, b) {
    tmpBin = {
        x: x,
        y: y,
        count: 0
    };

    for (ii = 0; ii < b.length; ii++) {
        if (b[ii].x == x && b[ii].y == y) {
            return (ii);
        }
    }

    // console.log (tmpList);
    return (false);
}