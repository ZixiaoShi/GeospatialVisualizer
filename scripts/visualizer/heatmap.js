/**
 * Created by freeze on 2015-11-17.
 */
define([
    'd3',
    './models'
],function(
    d3,
    models
){
    var heatMap = function(container){

        this.upperLimit = 100.0;
        this.lowerLimit = 0.0;

        var margin = {top: 20, right: 20, bottom: 30, left: 30},
            width = 500 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

        var now = new Date(),
            start = d3.time.year.floor(now),
            end = d3.time.year.ceil(now);

        this.drawHeatMap = function(datas, lowerlimit, upperlimit){
            console.log(Object.keys(datas));

            this.upperLimit = upperlimit;
            this.lowerLimit = lowerlimit;

            var x = d3.scale.linear()
                .range([0, width])
                .domain([0, 12]);

            var y = d3.scale.ordinal()
                .rangeRoundBands([height, 0],.1,.2)
                .domain(Object.keys(datas));

            var color = d3.scale.linear()
                .domain([this.lowerLimit, this.upperLimit])
                .range(['#0AF229', '#F20505']);

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient('bottom');

            var yAxis = d3.svg.axis()
                .scale(y)
                .orient('left');

            var svg = d3.select($(container)[0]).append('svg')
                .attr('width', width + margin.left + margin .right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            var ids = Object.keys(datas);

            svg.selectAll('rect')
                .data(ids)
                .enter()
                .append('rect')
                .attr('id', function(d){return d;})
                .attr('x', function(){return x(0);})
                .attr('y', function (d) {
                    return y(d);
                })
                .attr('width', width)
                .attr('height', function(){return height/ids.length})
                .style('fill', function () {
                    return color(200000.0);
                });

            for (var i =0; i < ids.length; i ++) {
                console.log(datas[ids[i]]);
                 svg.selectAll('rect')
                    .data(datas[ids[i]])
                    .enter()
                     .append('rect')
                    .attr('id', function(){ids[i]})
                    .attr('x', function(){x(0)})
                    .attr('y', function () {
                        return y(ids[i]);
                    })
                    .attr('width', width)
                    .attr('height', y(ids[1]-y(ids[0])))
                    .style('fill', function () {
                        return color(200000.0);
                    });
            }

            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis);

        };
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

    return {
        heatMap: heatMap
    };
});