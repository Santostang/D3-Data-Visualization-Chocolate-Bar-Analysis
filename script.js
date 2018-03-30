// Create a svg for map
var MAP_WIDTH = 900;
var MAP_HEIGHT = 400;

var svg_map = d3.select("#map")
.append("svg")
.attr("width", MAP_WIDTH)
.attr("height", MAP_HEIGHT);

// Define map projection
var projection = d3.geoEquirectangular().scale(175).translate([355,220]);
// Define path generator
var pathGenerator = d3.geoPath().projection(projection);

var cocoaData, mapData, countries, usaDataMap;

// Details Section
var usaChocolateBarsByBeanOrigin;
var details = d3.select("#details");

var DETAILS_WIDTH = MAP_WIDTH;
var COUNTRY_PER_ROW = 4;
var BAR_PER_ROW = 5;
var COUNTRY_SPACING = 36;
var BAR_SPACING = 0;
var BAR_WITDH, COUNTRY_BOX_WIDTH, COUNTRY_BOX_HEIGHT;

COUNTRY_BOX_WIDTH =  ((DETAILS_WIDTH - (COUNTRY_PER_ROW-1) * COUNTRY_SPACING) / COUNTRY_PER_ROW) 
BAR_WITDH = (COUNTRY_BOX_WIDTH / BAR_PER_ROW) - BAR_SPACING
COUNTRY_BOX_HEIGHT = (BAR_WITDH * 10) + 40

function parseLine(line) {
    line.Rating = Number(line.Rating);
    line.Broad_Bean_Origin = line.Broad_Bean_Origin.trim();
    line.Cocoa_Percent = Number(parseFloat(line.Cocoa_Percent));
    return line;
}

var imported_node;
d3.xml("./res/chocolate_bar.svg", function(xml) {
    imported_node = document.importNode(xml.documentElement, true);
});

d3.csv("./data/chocolate.csv", parseLine, function(error, data) {
    if (error) {
        console.log(error);
        return;
    }

    var cocoaData = data;

    // Data for the map
    var usaChocolateBarsByBeanOriginMap = d3.nest()
    .key((d) => d.Company_Location)
    .key((d) => d.Broad_Bean_Origin)
    .entries(data)[1].values;

    // Data for the detailed breakdown
    var usaChocolateBarsByBeanOrigin = d3.nest()
    .key((d) => d.Company_Location)
    .key((d) => d.Broad_Bean_Origin)
    .entries(data)[1].values;

    // Get Map Data
    d3.json("./data/world-50m.json", function(error, data) {
        if (error) { console.log(error); }

        var mapData = data;  
        var countries = topojson.feature(mapData, mapData.objects.countries);

        d3.json("./data/countryCodes.json", function(error, countrycodes) {
            if (error) { console.log(error); }

            // get the ISO-3166 country codes
            var codeList = d3.map(countrycodes, function(country) { return country["name"]; });
            var codes = countrycodes;
            codes.forEach(function(d) {
                usaChocolateBarsByBeanOriginMap.forEach(function(e) {
                    if (d.name.includes(e.key)) {
                        e["codes"] = d["country-code"];
                    }
                });
            });
            
            // Get countries' latitude and longtitude
            d3.json("./data/countryposition.json", function(error, position) {
                if (error) { console.log(error); }

                var pos = position;
                pos.forEach(function(d) {
                    usaChocolateBarsByBeanOriginMap.forEach(function(e) {
                        if (d.FIELD1.includes(e.key)) {
                            e.lantitude=d.lantitude;
                            e.longitude=d.longitude;
                        }
                    });
                });

                // Filter out cocoa bean origins that cannot match the country name
                usaDataMap = usaChocolateBarsByBeanOriginMap.filter(function(el) { 
                    return el.longitude != null & el.key != ""; 
                });

                // Draw the map
                svg_map.selectAll("path")
                .data(countries.features).enter()
                .append("path")
                .attr("d", pathGenerator)
                .style("stroke","rgb(140, 97, 77)")
                .style("stroke-width", 0.2)
                .style("fill", function(country) {
                    var find = 0;
                    usaDataMap.forEach(function(d) {
                        if (d.codes == country.id) {
                            find = 1;
                            color = "#ce978e";
                        }
                    })
                    if (find == 0) { return "#efddce"; }
                    else { return color; }
                });

                showCircle();
            });
        });
    });

    function showCircle() {
        // Radius is scaled by number of products
        var radiusScale = d3.scaleSqrt().domain([1,117]).range([5, 15]);

        // Color represents the average rating
        var color = d3.scaleQuantile()
        .domain([25,35])
        .range(['rgb(140, 97, 77)','rgb(112, 59, 24)','rgb(58, 30, 17)']);

        var legend = svg_map.append("g");

        // Create a function for avearge
        Array.prototype.avg = function (prop) {
            var total = 0
            for ( var i = 0, _len = this.length; i < _len; i++ ) {
                total += this[i][prop];
            }
            return total/this.length;
        }

        // Add country names that we need to adjust the position of label
        var country_superup = ["Dominican Republic", "Uganda"]
        var country_superdown = ["Ghana","Madagascar"]
        var country_moveup = ["Côte d'Ivoire", "Jamaica", "Papua New Guinea"];
        var country_moveright = ["Haiti", "Puerto Rico", "Grenada", "Trinidad", "Venezuela", "Colombia"];
        var country_moveleft = ["Guatemala", "Belize", "Honduras", "Nicaragua", "Costa Rica", "Panama", "Ecuador", "Peru"];

       // Draw circles
        var circles = svg_map.selectAll("circle")
        .data(usaDataMap).enter()
        .append("circle");

        circles
        .attr("cx", (d) => projection([d.longitude,d.lantitude])[0])
        .attr("cy", (d) => projection([d.longitude,d.lantitude])[1])
        .attr("r", (d) => radiusScale(d.values.length))
        .attr("fill", (d) => color(d.values.avg("Rating") * 10))
        .attr("opacity", 0.8);    

        // Text labels for circles
        var texts = svg_map.selectAll("text")
        .data(usaDataMap).enter()
        .append("text"); 

        texts
        .attr("x", function(d) {
            if (country_moveright.indexOf(d.key) > -1) {
                return 190;
            } else if (country_moveleft.indexOf(d.key) > -1) {
                return 73;
            } else {
                return projection([d.longitude,d.lantitude])[0];
            }
        })
        .attr("y", function(d) {
            if (country_moveup.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[1] - 25;
            } else if (country_superup.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[1] - 40;
            } else if (country_superdown.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[1] + 35;
            } else if (country_moveleft.indexOf(d.key) > -1) {
                var pos = country_moveleft.indexOf(d.key);
                return (pos * 15) + 190;                
            } else if (country_moveright.indexOf(d.key) > -1) {
                var pos = country_moveright.indexOf(d.key);
                return (pos * 15) + 160;
            } else {
                return projection([d.longitude,d.lantitude])[1] + radiusScale(d.values.length) + 12;
            }
        })
        .attr("text-anchor", function(d) {
            if (country_moveright.indexOf(d.key) > -1){
                return "start";
            } else if (country_moveleft.indexOf(d.key) > -1){
                return "end";
            } else {
                return "middle";
            }
        })
        .attr("alignment-baseline", function(d) {
            if (country_superup.indexOf(d.key) > -1){
                return "baseline";
            } else if (country_superdown.indexOf(d.key) > -1){
                return "hanging";
            } else {
                return "baseline";
            }
        })
        .style("font-size", "14")
        .style("font-weight", "800")
        .text((d) => d.key);

        // Add lines that connect the center of circles and the country name tags
        var lines = svg_map.selectAll("line")
        .data(usaDataMap).enter()
        .append("line");

        lines
        .attr("x1", function (d) {
            if (country_moveup.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[0];
            } else if (country_superdown.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[0];
            } else if (country_superup.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[0];
            } else if (country_moveright.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[0];
            } else if (country_moveleft.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[0];
            }              
        })
        .attr("y1", function (d) {
            if (country_moveup.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[1];
            } else if (country_superdown.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[1];
            } else if (country_superup.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[1];
            } else if (country_moveleft.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[1];
            } else if (country_moveright.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[1];
            }
        })
        .attr("x2", function (d) {
            if (country_moveup.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[0];
            } else if (country_superdown.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[0];
            } else if (country_superup.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[0];
            } else if (country_moveright.indexOf(d.key) > -1) {
                return 185;
            } else if (country_moveleft.indexOf(d.key) > -1) {
                return 75;
            }
        })
        .attr("y2", function(d){
            if (country_moveup.indexOf(d.key) > -1){
                return projection([d.longitude,d.lantitude])[1] - 20;
            } else if (country_superdown.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[1] + 35;
            } else if (country_superup.indexOf(d.key) > -1) {
                return projection([d.longitude,d.lantitude])[1] - 35;
            } else if (country_moveright.indexOf(d.key) > -1) {
                var pos = country_moveright.indexOf(d.key);
                return (pos * 15) + 154;
            } else if (country_moveleft.indexOf(d.key) > -1) {
                var pos = country_moveleft.indexOf(d.key);
                return (pos * 15) + 185;
            } 
        })
        .attr("stroke-width", 0.5)
        .attr("stroke-opacity", 0.8)
        .attr("stroke", (d) => color(d.values.avg("Rating") * 10));
    }

    // Chocolate Bars by country
    var detailsLegend = d3.select("#details-legend");

    usaChocolateBarsByBeanOrigin.forEach(function (country) {
        // Only keep chocolate bar with rating equal or more than 3.5
        country.values = country.values.filter((bar) => bar.Rating >= 3.5);
        // Sort chocolate bar by rating
        country.values.sort((a,b) => b.Rating - a.Rating);
    });
    // Sort country by the number of chocolate bar with rating equal or more than 3.5
	usaChocolateBarsByBeanOrigin.sort((a,b) => b.values.length - a.values.length);
    
    var skipCountry = 0;
    usaChocolateBarsByBeanOrigin.forEach(function (barsByOrigin, originIDx) {

        var country = barsByOrigin.key;
        var chocolateBars = barsByOrigin.values;

        // Ignore country without 3.5 chocolate bars and non country
        if (chocolateBars.length == 0 || !country || 
            country == "South America" || country == "Central and S. America") { 
            skipCountry += 1;
            return; 
        }
        if (country == "Hawaii") {
            country = country + "*";
        }

        // Calculate the height based on number of rows
        if (((originIDx-skipCountry) % COUNTRY_PER_ROW) ==  0) {
            var rows = Math.ceil(chocolateBars.length/BAR_PER_ROW);
            COUNTRY_BOX_HEIGHT = BAR_WITDH * (rows+2);
        }

        // Draw chocolate bar
        var countrySVG = details.append("svg")
        .attr("width", COUNTRY_BOX_WIDTH)
        .attr("height", COUNTRY_BOX_HEIGHT);
        
        // Add svg to separate countries
        if (((originIDx-skipCountry) % COUNTRY_PER_ROW) !=  (COUNTRY_PER_ROW-1)) {
            details.append("svg").attr("width", COUNTRY_SPACING);
        }

        // Country Title
        countrySVG.append("text")
        .attr("x", 0)
        .attr("y", 30)
        .style("text-anchor", "start")
        .style("alignment-baseline", "baseline")
        .text(country);

        // Draw small square in chocolate bar
        var barSVG = countrySVG.append("g");
        barSVG.attr("transform", "translate(0, 50)");
        
        barSVG.selectAll(".svg_image")
        .data(chocolateBars).enter()
        .append("g")
        .attr("class","svg_chocolate")
        .each(function(bar, idx){
            // Choose color for rating
            var barRatingColor = "#753d22"
            if (bar.Rating == 4) {
                barRatingColor = "#3a1e11"
            } else if (bar.Rating == 3.75) {
                barRatingColor = "#51280d"
            }
            // Clone and append xml node to each data binded element.
            imported_svg = this.appendChild(imported_node.cloneNode(true));
            imported_svg.removeChild(imported_svg.children[1])  
            imported_svg.children[1].setAttribute("fill", barRatingColor)
            imported_svg.children[1].removeAttribute("class")
            imported_svg.setAttribute("width", BAR_WITDH)
            imported_svg.setAttribute("height", BAR_WITDH)
            imported_svg.setAttribute("x", (idx % BAR_PER_ROW) * (BAR_WITDH + BAR_SPACING))
            imported_svg.setAttribute("y", Math.floor(idx / BAR_PER_ROW) * (BAR_WITDH + BAR_SPACING))
        }); 
    });
})