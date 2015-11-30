/**
 * Created by freeze on 2015-11-17.
 */
define([
    'jquery',
    'Cesium',
    'd3',
    './models'
],function(
    $,
    Cesium,
    d3,
    models
){
    var heatMap = function(container, main){
        var main = main;

        this.upperLimit = 100.0;
        this.lowerLimit = 0.0;
        this.barWidth = 40.0;
        this.barMargin = 5.0;
        var self = this;
        this.start = d3.time.year.floor(new Date());
        this.end = d3.time.year.ceil(new Date());

        var margin = {top: 20, right: 20, bottom: 30, left: 30},
            width = 700.0 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

        this.drawHeatMap = function(datas, lowerlimit, upperlimit){
            var points = 20.0;
            var dates = generateDatesArray(this.start,this.end, points);
            var pointWidth = width/points;
            var names = [];
            for (var key in datas){
                names.push(datas[key].name);
            }

            //console.log(names);

            var ids = Object.keys(datas);
            height = (this.barWidth+2*this.barMargin)*ids.length - margin.top - margin.bottom;
            //console.log(Object.keys(datas));

            this.upperLimit = upperlimit;
            this.lowerLimit = lowerlimit;

            var x = d3.time.scale()
                .range([0, width])
                .domain([this.start, this.end]);

            var y = d3.scale.ordinal()
                .rangeRoundBands([height, 0],.1,.2)
                .domain(names);

            var color = d3.scale.linear()
                .domain([this.lowerLimit, this.upperLimit])
                .range(['#0AF229', '#F20505']);

            var xAxis = d3.svg.axis()
                .scale(x)
                .ticks(5)
                .orient('top');

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient('right');

            var formatTime = d3.time.format("%e %B");

            var tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

            var svg = d3.select($(container)[0]).append('svg')
                .attr('width', width + margin.left + margin .right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var chart = svg.append('g')
                .attr('id', 'ChartSection')
                .attr('width', width)
                .attr('height', height);

            var barGroup = chart.selectAll('g')
                .data(d3.entries(datas))
                .enter()
                .append('g')
                    .attr('id', function(d){return 'heatBar-' + d.key;})
                    .attr('x', function(){return x(self.start);})
                    .attr('y', function (d) {
                        return y(d.value.name);
                    })
                    .attr('width', width)
                    .attr('height', function(){return self.barWidth})
                    .style('stroke', '#FFFFFF ')
                    .style('stroke-opacity', 0);

            var checkboxes = chart.selectAll('foreignObject')
                .data(d3.entries(datas))
                .enter()
                .append('foreignObject')
                    .attr('class', 'brush-checkbox')
                    .attr('x', function(){return x(self.start)-margin.left;})
                    .attr('y', function (d) {
                        return y(d.value.name);
                    })
                .append("xhtml:body")
                .html(function(d){
                    return "<label class='inline'><input type='checkbox' class='brush' id='brush-" + d.key +
                        "' value='"+ d.key + "'><span class='lbl'> </span>               </label>"
                });

            barGroup
                .each(function(data,i){
                    //console.log(data);
                    barGroup.selectAll('#heatBar-' + data.key)
                        .data(dates)
                        .enter()
                        .append('rect')
                        .attr('x', function(d){ return x(d);})
                        .attr('y', function(){return y(data.value.name);})
                        .attr('width', pointWidth)
                        .attr('height', self.barWidth)
                        .style('fill', function(d){return color(data.value.timeInterval.getValue(new Cesium.JulianDate.fromDate(d)));})
                        .on('mouseover',function(d){
                            d3.select(this).style('stroke-opacity', 1);
                            main.outlineEntities(data.key);
                            tooltip.transition()
                                .duration(200)
                                .style("opacity", .9);
                            tooltip.html(formatTime(d) + "<br/>")
                                .style("left", (d3.event.pageX) + "px")
                                .style("top", (d3.event.pageY) + "px");
                        })
                        .on('mouseout', function(){
                            d3.select(this).style('stroke-opacity', 0);
                            main.deoutlineEntities(data.key);
                            tooltip.transition()
                                .duration(500)
                                .style("opacity", 0);
                        })
                        .on('click', function(){
                            main.focusEntities(data.key);
                        });


                });

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0,0)")
                .call(xAxis);

            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis);

        };

        $('#visualizer-brusher').on('click', function(){
            var hightlighted = [];
            $('.brush').each(function(){
                if (this.checked == true){
                    hightlighted.push(this.value);
                }
            });
            if (this.checked){
                main.brushEntities(hightlighted);
            }
            else{
                main.updateEntityColors()
            }
        });
        /*

        //console.log(data);

        svg.selectAll('.cell')
            .data(d3.entries(data))
            .enter().append('rect')
            .attr('x', function (d) { return x(d.value.day1); })
            .attr('y', function (d) { return y(d.value.lat2); })
            .attr('width', function (d) { return x(d.value.day2) - x(d.value.day1); })
            .attr('height', function (d) { return y(d.value.lat1) - y(d.value.lat2); })
            .attr('fill', function (d) { return color(d.value.altitude); });

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis);

            */



    };

    function generateDatesArray(startDate, stopDate, n){
        var range = Math.abs(stopDate.getTime() - startDate.getTime());
        var step = range/n;
        var startDateValue = startDate.getTime();
        var dateArray = [startDate];
        for (var i=0; i<n-1; i++){
            dateArray.push(new Date(startDateValue+step*i))
        }
        //console.log(dateArray);
        return dateArray
    }

    return {
        heatMap: heatMap
    };
});