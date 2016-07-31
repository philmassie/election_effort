//Globals
//var initial settings
var init_party = "African National Congress",
    init_metric = "Relative Change",
    all_data,
    curr_data;

//Sets map dimensions based on initial window width
var margin = {top: 0, left: 0, bottom: 0, right: 0},
    width = $(".div-svg").width() - margin.left - margin.right,
    mapRatio = 54/62;
    height = width * mapRatio

//Tells the map what projection to us
var projection = d3.geo.albers()
    .parallels([-22.125030057999936,-34.83417000582944])
    .center([0,0])
    .rotate([-25,0])
    .scale(1)
    .translate([0, 0]);
    
//Tells the map how to draw the paths from the projection
var path = d3.geo.path()
    .projection(projection); 

//Appened svg to the map-div
var map = d3.select(".div-svg")
    .append("svg")
        .attr("id", "svg-map")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("preserveAspectRatio", "xMidYMid meet");

// append a circle for tooltip positioning
var tip_circle = map.append("circle")
    .attr("id", "tip-circle")
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("r", 0)
    .attr("fill", "green")
    .style("opacity", 0);  

// initialise tooltip
var tip = d3.tip()
    .attr("class", "d3-tip")
    .direction('se')
    .offset([0, 0])
    .html(function(d) {
        return "<span>" + d + "</span>" ;
    })
map.call(tip);

// set legend dims
var leg_width = 380,
    leg_height = 55;
// initialise legend
var legend_svg = d3.select(".div-svg")
    .append("svg")
        .attr("id", "svg-legend")
        .attr("width", width)
        .attr("height", 55);
        //.attr("viewBox", "0 0 " + width + " " + 55)
        //.attr("preserveAspectRatio", "xMidYMid meet");

//Reading party list and candidate data
queue()
    .defer(d3.csv, "data/d3_party_list.csv")
    .defer(d3.csv, "data/d3_data_all.csv")
    .defer(d3.json, "data/za_provinces_low.json") //load geometry
    .defer(d3.json, "data/za_districts_low.json") //load geometry
    .await(ready);

function ready(error, csv_list, csv_data, topo_prov, topo_dist) {
    if (error) throw error;

    // make csv numbers numeric
    csv_data.forEach(function(d) {
        d["Relative Change"] = (+d["Relative Change"] * 100).toFixed(2);
        d["Absolute Change"] = +d["Absolute Change"];
    });

    // update global
    all_data = csv_data
    
    // subset initial data
    init_data = get_new_data();
     
    // populate the the two dropdowns
    dropdown_party_populate(csv_list);
    dropdown_metric_populate();

    // assign topoJSON Features or FeatureCollections to variables
    var districts = topojson.feature(topo_dist, topo_dist.objects.DistrictMunicipalities2011);
        
    // Compute the bounds of districts, then derive scale & translate.
    var b = path.bounds(districts),
        s = .95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
        t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];
    // Update the projection to use computed scale & translate.
    projection
        .scale(s)
        .translate(t);

    // Draw  South Africa borders, thicker and softer, behind map.
    var prov_external = topojson.mesh(topo_prov, topo_prov.objects.Province_New_SANeighbours, function(a, b) { return a == b; })    
    var prov_external_line = map.append("path")
        .datum(prov_external)
        .attr("d", path)
        .attr("class", "prov_external"); 

    // Draw South Africa district geometry to map   
    // bind and populate with initial data
    map.append("g")
        .selectAll("path")
        .data(districts.features)
        .enter()
            .append("path")
                .attr("class", "districts")
                .attr("id", function(d) { return d.properties.DISTRICT })
                .attr("party", init_data.name)
                .attr("province", function(d) { return d.properties.PROVNAME; })
                .attr("district", function(d) { return d.properties.MUNICNAME; })
                .attr("metric", init_data.metric)
                .attr("delta", function(d) { return init_data.data[d.properties.DISTRICT]; })
                .attr("d", path)
                .style("fill", function(d) { return init_data.colscale(init_data.data[d.properties.DISTRICT]); })
                .style("opacity", 0.8)
                .on("mouseover", over)
                .on("mouseout", out)

    // Draw internal boundary lines
    // provincial internal and external to country
    var prov_internal = topojson.mesh(topo_prov, topo_prov.objects.Province_New_SANeighbours, function(a, b) { return a !== b; })
    
    // district internal and external to provinces - not working
    var dist_internal = topojson.mesh(topo_dist, topo_dist.objects.DistrictMunicipalities2011, function(a, b) { return a !== b; })
    //var dist_external = topojson.mesh(za_dist_data, za_dist_data.objects.DistrictMunicipalities2011, function(a, b) { alert(a.PROVNAME) })

    /*var dist_external_line = map.append("path")
        .datum(dist_external)
        .attr("d", path)
        .attr("class", "dist_external"); */ 

    var dist_internal_line = map.append("path")
        .datum(dist_internal)
        .attr("d", path)
        .attr("class", "dist_internal");       

    var prov_internal_line = map.append("path")
        .datum(prov_internal)
        .attr("d", path)
        .attr("class", "prov_internal");
}



// FUNCTIONS
// =========
// general document ready functions
$( document ).ready(function() {

    $('.party-heading').val(init_party)
    $('.metric-heading').val(init_metric)
    
    $(".party-dropdown").on("click", "a", function() {

        
        sel_party = $(this).data("party")
        sel_metric = curr_data.metric
        $('.party-heading').val(sel_party)
        //console.log(sel_party)
        get_new_data(sel_party, sel_metric);
    });
    $(".metric-dropdown").on("click", "a", function() {
        
        sel_party = curr_data.name
        sel_metric = $(this).data("metric")
        //console.log(sel_metric)
        $('.metric-heading').val(sel_metric)
        get_new_data(sel_party, sel_metric);        
    });
});

// responsive resize
// This doesnt redraw anything, only scales it. Much faster than redrawing.
// Looks pretty ok for most applictions. If user opens very small window and drags it out
// resizing becomes apparent though.
d3.select(window).on("resize", function(d) {
    var targetWidth = $(".div-svg").width();
    d3.select("#svg-map").attr("width", targetWidth);
    d3.select("#svg-map").attr("height", targetWidth * mapRatio);
    d3.select("#svg-legend").attr("width", targetWidth);
    d3.select(".legend-gradient").attr("transform", "translate(" + ((targetWidth - leg_width) / 2) + ",0)" );
    d3.select(".x").attr("transform", "translate(" + ((targetWidth - leg_width) / 2) + ",20)" );
    map.call(tip);
})

// place and populate legend
function update_legend(data){
    legend_svg.selectAll("*").remove();
    
    //Append a defs (for definition) element to your SVG
    var defs = legend_svg.append("defs");
    //Append a linearGradient element to the defs and give it a unique id
    var legend = defs.append("linearGradient")
        .attr("id", "linear-gradient")
        .attr("x1", "100%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "0%");
        
    // Assign colour ranges and number domains
    if (data.data_skew == "two_sided"){
        var col_range = data.colscale.range().reverse()
        var num_domain = data.colscale.domain().reverse() 
    }else if (data.data_skew == "lower") {
        var col_range = ([data.colscale(data.data_max - 0.0000001), data.colscale(data.data_min)]) // data.colscale(data.data_min) erring on red side
        var num_domain = [data.data_min, data.data_max]
    }else if (data.data_skew == "upper") {
        var col_range = ([data.colscale(data.data_max), data.colscale(data.data_min + 0.0000001)]) // data.colscale(data.data_min) erring on red side
        var num_domain = [data.data_min, data.data_max]
    }
    
    // Append multiple color stops by using D3"s data/enter step
    legend.selectAll("stop") 
        .data(col_range)                  
        .enter().append("stop")
        .attr("offset", function(d,i) { // think about how to scale this more nicely
            if (data.data_skew == "two_sided"){
                if (i == 0 || i == 3) {
                    return i/(col_range.length-1);
                } else {
                    return 0.5
                }
            }else{
                return i/(col_range.length-1);
            }
        }) 
        //.attr("offset", function(d,i) { return i/(col_range.length-1); }) // causing 0, 1/3, 2/3, 1
        .attr("stop-color", function(d) { return d; });
    
    // size & pos

    stemp = parseInt(d3.select('#svg-map').style('width'), 10)
    dx = (stemp - leg_width ) / 2
    
    var size_pos = { width: leg_width, height: 20 , dx: dx, dy: 0 }
    //Draw the rectangle and fill with gradient
    legend_svg.append("rect")
    .attr("class", "legend-gradient")
        .attr("width", size_pos.width)
        .attr("height", size_pos.height)
        .style("fill", "url(#linear-gradient)")
        .attr("transform", "translate(" + size_pos.dx + "," + size_pos.dy + ")");
    
    // axis stuff
    if (data.data_skew == "two_sided"){
        var range = [size_pos.width, size_pos.width/2, size_pos.width/2, 0] ;
        var tick_vals = [data.data_min, 0, data.data_max];        
    }else{
        var range = [0, size_pos.width]
        var tick_vals = [data.data_min, data.data_max]
    }    
    
    var x = d3.scale.linear()
        .domain(num_domain)
        .range(range);

    // initalise x axis
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("below")
        .tickValues(tick_vals);
    
    if (data.metric == "Relative Change"){
        axis_title = "Relative change in PR Representatives (%)"
    }else{
        axis_title = "Absolute change in PR Representatives (number of individuals)"
    }
    // append legend axis
    legend_svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(" + size_pos.dx + "," + size_pos.height + ")")
        .call(xAxis)
        .append("text")
            .attr("x", leg_width/2)
            .attr("y", 30)
            .style("text-anchor", "middle")
            .text(axis_title);
}

// COLORS
// build a colour scale function
function colour_scale(csv_data, metric){
    //console.log(csv_data)
    var min = d3.min(csv_data, function(d) { return +d[metric]; }),
        mid_l = "0",
        mid_h = "0",
        max = d3.max(csv_data, function(d) { return +d[metric]; }),
        mincol = "#053061",
        midcol_l = "#d1e5f0",
        midcol_h = "#fddbc7",
        maxcol = "#f46d43"
        
    var color = d3.scale.linear()
        .domain([min, mid_l, mid_h, max])
        .range([mincol, midcol_l, midcol_h, maxcol]);
    //console.log(color(max))
    return color;    //return the color scale generator
}; 

// DATA
function get_new_data(new_party, new_metric){

    new_party = new_party || init_party;
    new_metric = new_metric || init_metric;

    console.log(new_party + new_metric)
    // Subset the main data to include only the required party
    csv_data_sub = all_data.filter(function(row) {
        return row["party"] == new_party;
    })
    
    // generate an array of district codes and their metric
    var pdata = {};
    csv_data_sub.forEach(function(d) {
        pdata[d.dist_code] = +d[new_metric]
    });
    // min, max, 
    var min = d3.min(csv_data_sub, function(d) { return +d[new_metric]; })
    var max = d3.max(csv_data_sub, function(d) { return +d[new_metric]; })
    
    // check if data is skewed
    if (min < 0 && max > 0){ var skew = "two_sided" };
    if (min < 0 && max <= 0){ var skew = "lower" };
    if (min >= 0 && max > 0){ var skew = "upper" };
    
    // combine data into new data set
    var arr_party = {
        name: new_party,
        metric: new_metric,
        data: pdata,
        data_skew: skew,
        data_min: min,
        data_max: max,
        colscale: colour_scale(csv_data_sub, new_metric),
    }
    // update global  
    curr_data = arr_party
    // update map
    update_map(arr_party)
    // update legend
    update_legend(arr_party)
    // update global for legend update
    return(arr_party)
};
function update_map(new_arr_data){
    //recolor the map and bind new data
    d3.selectAll(".districts") //select every region
        .style("fill", function(d) { //color enumeration units
            
            if (new_arr_data.data[d.properties.DISTRICT]) {
                return new_arr_data.colscale(new_arr_data.data[d.properties.DISTRICT]);
            } else if (new_arr_data.data[d.properties.DISTRICT] == 0){
                return "white";
            } else {
                return "#d9d9d9";
            }
        })
        .attr("party", new_arr_data.name)
        .attr("province", function(d) { return d.properties.PROVNAME; })
        .attr("district", function(d) { return d.properties.MUNICNAME; })
        .attr("metric", new_arr_data.metric)
        .attr("delta", function(d) { return new_arr_data.data[d.properties.DISTRICT]; })
};

// DROPDOWNS
function dropdown_metric_populate(){
    var metric_array = ["Relative Change", "Absolute Change"]
    for( index in metric_array )
    {
      $('.metric-dropdown ul').append('<li><a href="#" data-metric="' + metric_array[index] + '" >' + metric_array[index] + '</a></li>');
    }
};       
function dropdown_party_populate(csv_list){
    for( index in csv_list )
    {
      $('.party-dropdown ul').append('<li><a href="#" data-party="' + csv_list[index].party + '" >' + csv_list[index].party + '</a></li>');
    }
};

// MOUSE EVENTS
function over(d) {
    var dist_id = "#" + d.properties.DISTRICT
    if (d3.select(dist_id).attr("delta")){
        d3.select(this)
            .transition()
                .duration(300)
                .style("opacity", 1);

        var party = d3.select(dist_id).attr("party")
        var province = d3.select(dist_id).attr("province")
        var district = d3.select(dist_id).attr("district")
        var metric = d3.select(dist_id).attr("metric")
        if (metric == "Relative Change"){
            var delta = d3.select(dist_id).attr("delta") + "%"
        } else {
            var delta = d3.select(dist_id).attr("delta")
        }
        
        var labelAttribute = "<h5>" + party + "</h5><br>" + 
            "<b>Province:</b>&nbsp" + province + "<br>" +
            "<b>Municipality/district:</b>&nbsp" + district + "<br>" +
            "<b>Metric:</b>&nbsp" + metric.replace(/_/g," ") + "<br>" +
            "<b>Change:</b>&nbsp" + delta + ""; //label content
        tip.show(labelAttribute, document.getElementById("tip-circle"))
        //tip.show(labelAttribute, document.getElementById("tip-circle"))
    }
};
function out(d) {
    tip.hide()
    d3.select(this)
        .transition()
            .duration(300)
            .style("opacity", 0.8);
};

