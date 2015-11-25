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
        this.barWidth = 40.0;
        this.barMargin = 5.0;
        var self = this;
        this.start = d3.time.year.floor(new Date());
        this.end = d3.time.year.ceil(new Date());

        var margin = {top: 20, right: 20, bottom: 30, left: 30},
            width = 500 - margin.left - margin.right,
            height = 500 - margin.top - margin.bottom;

        this.drawHeatMap = function(datas, lowerlimit, upperlimit){
            var ids = Object.keys(datas);
            height = (this.barWidth+2*this.barMargin)*ids.length - margin.top - margin.bottom;
            //console.log(Object.keys(datas));

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

            svg.selectAll('rect')
                .data(ids)
                .enter()
                .append('g')
                .attr('id', function(d){return 'heatBar-' + d;})
                .attr('x', function(){return x(0);})
                .attr('y', function (d) {
                    return y(d);
                })
                .attr('width', width)
                .attr('height', function(){return self.barWidth})
                .style('stroke', '#FFFFFF ')
                .style('stroke-opacity', 0)
                .on('mouseover',function(){
                    d3.select(this).style('stroke-opacity', 1);
                }
            )
                .on('mouseout', function(){
                    d3.select(this).style('stroke-opacity', 0);
                });

            for (var i =0; i < ids.length; i ++) {
                //console.log(datas[ids[i]]);
                var data = datas[ids[i]];
                var intervals = data.timeInterval;
                console.log(intervals);
                //console.log(data);
                svg.select('#heatBar-' + ids[i])
                    .append('rect')
                    .attr('x', x(0))
                    .attr('y', y(ids[i]))
                    .attr('width', 10.0)
                    .attr('height', self.barWidth)
                    .style('fill', '#000000');
                /*
                 svg.selectAll('rect')
                    .data(data)
                    .enter()
                     .append('rect')
                    .attr('x', function(){return x(0);})
                    .attr('y', function (d) {
                        return y(d.id);
                    })
                    .attr('width', function(){return 40.0;})
                    .attr('height', self.barWidth)
                    .style('fill', '#000000');
                    */
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