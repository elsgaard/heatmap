const HEATMAP_DATA_URL = "https://dev.mooserocket.dk/heatmap/durationMs?last=1h";
const POST_URL = "https://dev.mooserocket.dk/heatmap/durationMs/analyze";

function displayGraphs(timeInterval, ppBinX, ppBinY) {
    const heatUrl = HEATMAP_DATA_URL;

    fetch(heatUrl)
        .then(function (response) {
            return response.json();
        })
        .then((json) => {
            d3.selectAll('svg').remove();
            ggPrepare(json, timeInterval, ppBinX, ppBinY);
            heatmapGraph(json);
        })
        .catch((err) => {
            console.log(err);
        });
}

/* Heatmap graph
 * =============
 */
function heatmapGraph(json) {

    // Svg Object to main graph div
    var svg = d3.select("#heatmap-graph")
        .append("svg")
        .attr("width", gg.graphWidth)
        .attr("height", gg.graphHeight)
        .append("g")
        .attr("transform",
            "translate(" + gg.margin.left + "," + gg.margin.top + ")");


    // Draw X and Y axis
    drawX(svg); drawY(svg);

    var x = d3.scaleLinear()
        .domain([0, (gg.timeMax - gg.timeMin)])
        .range([0, gg.graphWidth - gg.margin.left - gg.margin.right]);

    var y = d3.scaleLinear()
        .domain([gg.valueMin, gg.valueMax])
        .range([gg.graphHeight - gg.margin.top - gg.margin.bottom, 0]);

    // Bins
    var bins = bin(gg);

    // Heatmap colors fill
    var color = d3.scaleSequential()
        .domain([0, d3.max(bins.map(c => c.count))])
        //.range(["#bbddd5", "#116048"]);
        //.range(["#", "#"]);
        .range(["#919bff", "#133a94"]);

    // Heatmap rectangle width and height
    rectWidth = ((gg.graphWidth - gg.margin.left - gg.margin.right) / (gg.timeMax - gg.timeMin)) * gg.xBinSize;
    rectHeight = ((gg.graphHeight - gg.margin.top - gg.margin.bottom) / (gg.valueMax - gg.valueMin)) * gg.yBinSize;

    // Mouse functions
    // create a tooltip
    const tooltip = d3.select("#heatmap-graph")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("color", "black")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "15px")
        .style("font-size", "10px")
        .style("position", "absolute")

    // Three function that change the tooltip when user hover / move / leave a cell
    const mouseover = function (event, d) {
        tooltip
            .style("opacity", 1)
        d3.select(this)
            .style("stroke", "black")
            .style("opacity", 0.6)
    }
    const mousemove = function (event, d) {
        tooltip
            .html("Count: " + d.count + "<br>x:" + d.x + "<br>y:" + d.y)
            .style("left", (x(d.x) + gg.margin.left + document.querySelector('#heatmap-graph').getBoundingClientRect().left) + 30 + "px")
            .style("top", (y(d.y) + gg.margin.top + gg.margin.bottom) + "px")
    }
    const mouseleave = function (event, d) {
        tooltip
            .style("opacity", 0)
        d3.select(this)
            .style("stroke", "none")
            .style("opacity", 1)
    }
    const mouseclick = function (event, d) {
        alert("Count: " + d.count + "\nx:" + d.x + "\ny:" + d.y + "\nAnything is possible here");
    }

    // Draw graph
    svg.append('g')
        .selectAll(".square")
        .data(bins)
        .enter()
        .append("rect")
        .attr("rx", 1.4)
        .attr("ry", 1.4)
        .attr("x", function (d) { return x(d.x) })
        .attr("y", function (d) { return y(d.y) })
        .style("width", (rectWidth) + "px")
        .style("height", (rectHeight) + "px")
        .attr("transform", "translate(" + ((0) + "," + -rectHeight + ")"))
        .style("fill", function (d) { return color(d.count); })
        .attr("class", "single-rect")

    // Brushing
    d3.select("g")
        .call(d3.brush()
            //.extent([[gg.margin.left, gg.margin.bottom], [gg.graphWidth - gg.margin.right, gg.graphHeight - gg.margin.top]])
            //.extent([[0,0], [gg.graphWidth, gg.graphHeight]])
            .extent([[0, 0], [gg.graphWidth - gg.margin.right - gg.margin.left, gg.graphHeight - gg.margin.top - gg.margin.bottom]])
            .on("start end", doSelection)
        )

    function doSelection(event) {
        const selection = event.selection;
        var realGraphHeight = gg.graphHeight - gg.margin.top - gg.margin.bottom;

        if (selection === null) {
            return null;
        } else {
            if ((selection[0][0] != selection[1][0]) || (selection[0][1] != selection[1][1]) && (event.type === "end")) {
                pushData(selection[0][0], realGraphHeight - selection[0][1], selection[1][0], realGraphHeight - selection[1][1]);
            }
        }
    }

    // Catching double click event
    var doubleClickFlag = false;
    d3.selectAll("#heatmap-graph").on("mousedown", function (event, d) {
        if (doubleClickFlag) {
            var xx = event.clientX - document.querySelector('#heatmap-graph').getBoundingClientRect().left - gg.margin.left - 1;
            var yy = event.clientY - document.querySelector('#heatmap-graph').getBoundingClientRect().top - gg.margin.top - 1;
            var realGraphHeight = gg.graphHeight - gg.margin.top - gg.margin.bottom;

            pushData(xx, realGraphHeight - yy, xx, realGraphHeight - yy);

            doubleClickFlag = false;
        } else {
            // Reset click flag after 500 ms
            setTimeout(function () { doubleClickFlag = false; }, 500);
        }
        doubleClickFlag = !doubleClickFlag;
    })

    // Prepare data and send to URL
    function pushData(xstart, ystart, xend, yend) {
        var resData = {
            selectedLowerValue: Math.round(gg.valueMax-y.invert(ystart)),
            selectedUpperValue: Math.round(gg.valueMax-y.invert(yend)),
            selectedStartTime: Math.round(x.invert(xstart) + gg.timeMin),
            selectedEndTime: Math.round(x.invert(xend) + gg.timeMin),
            chartLowerValue: gg.valueMin,
            chartUpperValue: gg.valueMax,
            chartStartTime: gg.timeMin,
            chartEndTime: gg.timeMax
        }

        d3.json(POST_URL,
            {
                method: "POST",
                body: JSON.stringify(resData),
            })
            .then(responsejson => { displayResponse(responsejson, resData); })
            .catch(error => { console.log(error); });
    }
}

/* Display response
 * ================
 * Display POST_URL server response below heatmap graph.
 */

function displayResponse (rjson, postedData) {
    rContainer = document.getElementById("response-container");
    postContainer = document.getElementById("post-container");

    rContainer.innerText = JSON.stringify(rjson, null, 4);
    postContainer.innerText = JSON.stringify(postedData, null, 4);
}

/* Draw X axis
 * ===========
 */
function drawX(ppSvg) {
    var x = d3.scaleTime()
        .domain([new Date(gg.timeMin * 1000), new Date(gg.timeMax * 1000)])
        .range([0, gg.graphWidth - gg.margin.left - gg.margin.right]);

    var xAxis = d3.axisBottom(x)
        .tickFormat(d3.timeFormat("%H:%M:%S"))
        .ticks(((gg.timeMax - gg.timeMin) / 300));

    ppSvg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(-1," + (gg.graphHeight - gg.margin.top - gg.margin.bottom) + ")")
        .call(xAxis)
        .selectAll("text")
        .attr("y", 15)
        .attr("x", 15)
        .attr("transform", "rotate(45)");
}

/* Draw Y axis
 * ===========
 */
function drawY(ppSvg) {
    var scale = d3.scaleLinear()
        .domain([gg.valueMin, gg.valueMax])
        .range([gg.graphHeight - gg.margin.top - gg.margin.bottom, 0]);

    var yAxis = d3.axisLeft()
        .scale(scale)
        .ticks((gg.valueMax - gg.valueMin) / (gg.yBinSize * 5));

    ppSvg.append("g")
        .attr("transform", "translate(-1, 0)")
        .call(yAxis);
}



/* Data ranges initialise
 * ======================
 * Read loaded JSON dataset and prepare data ranges. Important for drawing graphs.
 */
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

function ggPrepare(loadedDataset, ppTimeInterval, ppBinX, ppBinY) {

    // Save graph pass parameters to gg
    gg.timeInterval = parseInt(ppTimeInterval);
    gg.yBinSize = parseInt(ppBinY);
    gg.xBinSize = parseInt(ppBinX);

    // Extract just time array to 
    // determine min and max dataset values
    var timeArray = loadedDataset.map(function (tt) { return tt['time']; });

    // Min and max time ( time stamp )
    gg.timeMax = d3.max(timeArray);
    gg.timeMin = d3.max(timeArray) - (gg.timeInterval * 60);

    // Copy dataset and filter (cut) time values
    gg.gDJson = loadedDataset.filter(function (o) {
        if (o.time < gg.timeMin) {
            return false;
        }
        return (o);
    });

    // Determine array min and max values
    gg.valueMax = d3.max(gg.gDJson.map(d => d.value));
    gg.valueMin = d3.min(gg.gDJson.map(d => d.value));
}

